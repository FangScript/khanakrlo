package pk.khanakarlo.feature.customer

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import pk.khanakarlo.core.network.ApiClient
import pk.khanakarlo.core.network.generated.CustomerApi
import pk.khanakarlo.core.network.generated.PhoneConsent
import pk.khanakarlo.core.design.RequestStatus

@Composable
fun CustomerWorkspace(api: ApiClient, accessToken: String) {
    val customer = remember(api) { CustomerApi(api) }
    var phone by remember { mutableStateOf("") }
    var consent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column {
        Text("Your contact details")
        OutlinedTextField(value = phone, onValueChange = { phone = it.take(16) }, label = { Text("Phone with country code") }, singleLine = true, enabled = !busy)
        Row {
            Checkbox(checked = consent, onCheckedChange = { consent = it }, enabled = !busy)
            Text("I agree to use this number for my orders. Other users will not see it.")
        }
        Button(enabled = !busy && consent && Regex("^\\+[1-9]\\d{7,14}$").matches(phone), onClick = {
            busy = true
            scope.launch {
                try {
                    val result = customer.capturePhoneConsent(accessToken, PhoneConsent(phone, true))
                    phone = ""
                    consent = false
                    message = "Saved ${result.phone}"
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    message = error.message
                } finally { busy = false }
            }
        }) { Text("Save phone") }
        RequestStatus(busy, message)
    }
}
