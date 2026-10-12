package pk.khanakarlo.mobile

import android.os.Bundle
import pk.khanakarlo.core.auth.SessionTokenStore
import pk.khanakarlo.core.auth.SessionClient
import pk.khanakarlo.core.auth.MobileSession
import pk.khanakarlo.core.auth.IdentityApiException
import pk.khanakarlo.core.network.ApiClient
import pk.khanakarlo.feature.customer.CustomerWorkspace
import pk.khanakarlo.feature.merchant.MerchantWorkspace
import pk.khanakarlo.feature.rider.RiderWorkspace
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

private enum class Workspace(val role: String, val label: String, val heading: String) {
    CUSTOMER("customer", "Customer", "Discover restaurants"),
    MERCHANT("merchant", "Restaurant", "Kitchen orders"),
    RIDER("rider", "Rider", "Delivery offers");

    companion object { fun from(role: String) = entries.firstOrNull { it.role == role } }
}

class MainActivity : ComponentActivity() {
    private val sessionClient = SessionClient(BuildConfig.API_BASE_URL)
    private val api = ApiClient(BuildConfig.API_BASE_URL)
    private val tokenStore by lazy { SessionTokenStore(this) }
    private var session by mutableStateOf<MobileSession?>(null)
    private var busy by mutableStateOf(false)
    private var errorMessage by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        busy = true
        lifecycleScope.launch {
            val refresh = withContext(Dispatchers.IO) { runCatching { tokenStore.readRefreshToken() }.getOrNull() }
            if (refresh == null) { busy = false; return@launch }
            try {
                acceptSession(sessionClient.refresh(refresh))
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                busy = false
                if (error is IdentityApiException && error.status == 401) tokenStore.clear()
                errorMessage = error.message ?: "Could not restore your session."
            }
        }
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    val current = session
                    if (current == null) SignInScreen(busy, errorMessage, ::signInWithGoogle)
                    else WorkspaceRouter(current.roles, api, current.accessToken, ::signOut)
                }
            }
        }
    }

    private suspend fun acceptSession(value: MobileSession) {
        withContext(Dispatchers.IO) { tokenStore.writeRefreshToken(value.refreshToken) }
        session = value
        errorMessage = null
        busy = false
    }

    private fun signInWithGoogle() {
        if (busy) return
        busy = true
        errorMessage = null
        lifecycleScope.launch {
            try {
                if (BuildConfig.GOOGLE_SERVER_CLIENT_ID.isBlank()) throw IllegalStateException("Google sign-in is not configured for this build.")
                val option = GetGoogleIdOption.Builder()
                    .setServerClientId(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val credential = CredentialManager.create(this@MainActivity).getCredential(this@MainActivity, request).credential
                if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    throw IllegalStateException("Choose a Google account to continue.")
                }
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                acceptSession(sessionClient.exchangeGoogleToken(google.idToken))
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                busy = false
                errorMessage = error.message ?: "Could not sign in. Please try again."
            }
        }
    }

    private fun signOut() {
        val access = session?.accessToken
        session = null
        tokenStore.clear()
        lifecycleScope.launch { if (access != null) runCatching { sessionClient.logout(access) } }
    }
}

@Composable
private fun SignInScreen(busy: Boolean, error: String?, onGoogleSignIn: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("Khana KarLo", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("One app for your food journey, restaurant, and deliveries.", modifier = Modifier.padding(top = 12.dp), style = MaterialTheme.typography.bodyLarge)
        Button(onClick = onGoogleSignIn, enabled = !busy, modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) {
            if (busy) CircularProgressIndicator() else Text("Continue with Google")
        }
        if (error != null) Text(error, modifier = Modifier.padding(top = 16.dp), color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun WorkspaceRouter(roleNames: Set<String>, api: ApiClient, accessToken: String, onSignOut: () -> Unit) {
    val roles = remember(roleNames) { roleNames.mapNotNull(Workspace::from).toSet() }
    var active by remember(roleNames) { mutableStateOf(roles.singleOrNull()) }
    if (roles.isEmpty()) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("This account has no mobile workspace yet.", style = MaterialTheme.typography.titleLarge)
            Text("Contact support if you expected restaurant or rider access.")
            OutlinedButton(onClick = onSignOut) { Text("Sign out") }
        }
    } else if (active == null) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Choose a workspace", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            roles.forEach { workspace ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(workspace.label, style = MaterialTheme.typography.titleMedium)
                        Button(onClick = { active = workspace }) { Text("Open") }
                    }
                }
            }
            OutlinedButton(onClick = onSignOut) { Text("Sign out") }
        }
    } else {
        val workspace = active!!
        Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Khana KarLo", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Text(workspace.label, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            when (workspace) {
                Workspace.CUSTOMER -> CustomerWorkspace(api, accessToken)
                Workspace.MERCHANT -> MerchantWorkspace()
                Workspace.RIDER -> RiderWorkspace(api, accessToken)
            }
            if (roles.size > 1) OutlinedButton(onClick = { active = null }) { Text("Switch workspace") }
            OutlinedButton(onClick = onSignOut) { Text("Sign out") }
        }
    }
}
