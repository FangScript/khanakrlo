package pk.khanakarlo.feature.rider

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import pk.khanakarlo.core.network.ApiClient
import pk.khanakarlo.core.design.RequestStatus

@Composable
fun RiderWorkspace(api: ApiClient, accessToken: String) {
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column {
        Text("Cash held")
        Button(enabled = !busy, onClick = {
            busy = true
            scope.launch {
                try {
                    val custody = api.request("/payment/cod/custody", accessToken)
                    val paisa = custody.getLong("outstandingPaisa")
                    message = "Rs ${paisa / 100}.${(paisa % 100).toString().padStart(2, '0')} awaiting verified remittance"
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    message = error.message
                } finally { busy = false }
            }
        }) { Text("Refresh cash balance") }
        RequestStatus(busy, message)
    }
}
