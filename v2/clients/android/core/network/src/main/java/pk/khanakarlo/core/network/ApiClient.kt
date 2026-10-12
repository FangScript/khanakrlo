package pk.khanakarlo.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.io.ByteArrayOutputStream

class ApiException(val status: Int, override val message: String) : IllegalStateException(message)

/** One request per user action; write retries must retain their original idempotency key. */
class ApiClient(private val baseUrl: String) {
    suspend fun request(path: String, accessToken: String = "", method: String = "GET", body: JSONObject? = null, idempotencyKey: String? = null): JSONObject = withContext(Dispatchers.IO) {
        require(path.startsWith("/") && !path.contains(".."))
        val connection = URL(baseUrl.trimEnd('/') + "/v1" + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 3_000
            connection.readTimeout = 5_000
            connection.instanceFollowRedirects = false
            if (accessToken.isNotBlank()) connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.setRequestProperty("Accept", "application/json")
            if (idempotencyKey != null) connection.setRequestProperty("Idempotency-Key", idempotencyKey)
            if (body != null) {
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val bytes = stream?.use { input ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    check(output.size() + count <= 1_048_576) { "The response is too large. Please try again." }
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            } ?: byteArrayOf()
            val result = if (bytes.isEmpty()) JSONObject() else JSONObject(String(bytes, Charsets.UTF_8))
            if (status !in 200..299) throw ApiException(status, result.optString("message", "Could not complete the request. Please try again."))
            result
        } finally { connection.disconnect() }
    }
}
