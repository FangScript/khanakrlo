package pk.khanakarlo.core.auth

import org.json.JSONObject
import pk.khanakarlo.core.network.ApiClient
import pk.khanakarlo.core.network.ApiException

data class MobileSession(val accessToken: String, val refreshToken: String, val roles: Set<String>)
typealias IdentityApiException = ApiException

class SessionClient(baseUrl: String) {
    private val api = ApiClient(baseUrl)
    suspend fun exchangeGoogleToken(idToken: String): MobileSession = post("/identity/sessions/google", JSONObject().put("idToken", idToken).put("clientType", "android"))
    suspend fun refresh(refreshToken: String): MobileSession = post("/identity/sessions/refresh", JSONObject().put("refreshToken", refreshToken))
    suspend fun logout(accessToken: String) { api.request("/identity/sessions/logout", accessToken, "POST", JSONObject()) }
    private suspend fun post(path: String, body: JSONObject): MobileSession {
        val json = api.request(path, method = "POST", body = body)
        val roles = json.getJSONObject("user").getJSONArray("roles")
        return MobileSession(json.getString("accessToken"), json.getString("refreshToken"), (0 until roles.length()).map { roles.getString(it) }.toSet())
    }
}
