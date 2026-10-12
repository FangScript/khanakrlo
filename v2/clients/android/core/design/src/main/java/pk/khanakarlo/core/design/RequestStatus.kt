package pk.khanakarlo.core.design

import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun RequestStatus(busy: Boolean, message: String?) {
    if (busy) CircularProgressIndicator()
    if (message != null) Text(message, color = MaterialTheme.colorScheme.primary)
}
