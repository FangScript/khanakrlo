// Generated from contracts/openapi/customer.json. Run pnpm clients:generate.
package pk.khanakarlo.core.network.generated

import org.json.JSONObject
import org.json.JSONArray
import pk.khanakarlo.core.network.ApiClient

data class Profile(
    val id: String,
    val displayName: String,
    val phone: String?,
    val phoneConsentAt: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("displayName", displayName)
        put("phone", phone ?: JSONObject.NULL)
        put("phoneConsentAt", phoneConsentAt ?: JSONObject.NULL)
    }
    companion object {
        fun fromJson(json: JSONObject): Profile = Profile(
            id = json.getString("id"),
            displayName = json.getString("displayName"),
            phone = if (json.isNull("phone")) null else json.getString("phone"),
            phoneConsentAt = if (json.isNull("phoneConsentAt")) null else json.getString("phoneConsentAt")
        )
    }
}

data class ProfileUpdate(
    val displayName: String
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("displayName", displayName)
    }
    companion object {
        fun fromJson(json: JSONObject): ProfileUpdate = ProfileUpdate(
            displayName = json.getString("displayName")
        )
    }
}

data class PhoneConsent(
    val phone: String,
    val consent: Boolean
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("phone", phone)
        put("consent", consent)
    }
    companion object {
        fun fromJson(json: JSONObject): PhoneConsent = PhoneConsent(
            phone = json.getString("phone"),
            consent = json.getBoolean("consent")
        )
    }
}

data class MaskedPhone(
    val phone: String,
    val phoneConsentAt: String
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("phone", phone)
        put("phoneConsentAt", phoneConsentAt)
    }
    companion object {
        fun fromJson(json: JSONObject): MaskedPhone = MaskedPhone(
            phone = json.getString("phone"),
            phoneConsentAt = json.getString("phoneConsentAt")
        )
    }
}

data class AddressInput(
    val label: String,
    val addressLine: String,
    val latitude: Double,
    val longitude: Double
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("label", label)
        put("addressLine", addressLine)
        put("latitude", latitude)
        put("longitude", longitude)
    }
    companion object {
        fun fromJson(json: JSONObject): AddressInput = AddressInput(
            label = json.getString("label"),
            addressLine = json.getString("addressLine"),
            latitude = json.getDouble("latitude"),
            longitude = json.getDouble("longitude")
        )
    }
}

data class CartItem(
    val menuItemId: String,
    val quantity: Int,
    val modifierIds: List<String>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("menuItemId", menuItemId)
        put("quantity", quantity)
        put("modifierIds", JSONArray(modifierIds.map { item -> item }))
    }
    companion object {
        fun fromJson(json: JSONObject): CartItem = CartItem(
            menuItemId = json.getString("menuItemId"),
            quantity = json.getInt("quantity"),
            modifierIds = json.getJSONArray("modifierIds").let { values -> (0 until values.length()).map { index -> values.getString(index) } }
        )
    }
}

data class CartUpdate(
    val outletId: String,
    val version: Int,
    val items: List<CartItem>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("outletId", outletId)
        put("version", version)
        put("items", JSONArray(items.map { item -> item.toJson() }))
    }
    companion object {
        fun fromJson(json: JSONObject): CartUpdate = CartUpdate(
            outletId = json.getString("outletId"),
            version = json.getInt("version"),
            items = json.getJSONArray("items").let { values -> (0 until values.length()).map { index -> CartItem.fromJson(values.getJSONObject(index)) } }
        )
    }
}

data class Cart(
    val outletId: String?,
    val version: Int,
    val items: List<CartItem>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("outletId", outletId ?: JSONObject.NULL)
        put("version", version)
        put("items", JSONArray(items.map { item -> item.toJson() }))
    }
    companion object {
        fun fromJson(json: JSONObject): Cart = Cart(
            outletId = if (json.isNull("outletId")) null else json.getString("outletId"),
            version = json.getInt("version"),
            items = json.getJSONArray("items").let { values -> (0 until values.length()).map { index -> CartItem.fromJson(values.getJSONObject(index)) } }
        )
    }
}

data class Error(
    val error: String,
    val message: String?
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("error", error)
        put("message", message ?: JSONObject.NULL)
    }
    companion object {
        fun fromJson(json: JSONObject): Error = Error(
            error = json.getString("error"),
            message = if (json.isNull("message")) null else json.getString("message")
        )
    }
}

data class Address(
    val id: String,
    val label: String,
    val addressLine: String,
    val latitude: Double,
    val longitude: Double
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("label", label)
        put("addressLine", addressLine)
        put("latitude", latitude)
        put("longitude", longitude)
    }
    companion object {
        fun fromJson(json: JSONObject): Address = Address(
            id = json.getString("id"),
            label = json.getString("label"),
            addressLine = json.getString("addressLine"),
            latitude = json.getDouble("latitude"),
            longitude = json.getDouble("longitude")
        )
    }
}

data class Addresses(
    val items: List<Address>
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("items", JSONArray(items.map { item -> item.toJson() }))
    }
    companion object {
        fun fromJson(json: JSONObject): Addresses = Addresses(
            items = json.getJSONArray("items").let { values -> (0 until values.length()).map { index -> Address.fromJson(values.getJSONObject(index)) } }
        )
    }
}

class CustomerApi(private val api: ApiClient) {
    suspend fun getProfile(accessToken: String): Profile {
        val result = api.request("/customer/profile", accessToken, "GET")
        return Profile.fromJson(result)
    }
    suspend fun updateProfile(accessToken: String, body: ProfileUpdate): ProfileUpdate {
        val result = api.request("/customer/profile", accessToken, "PATCH", body = body.toJson())
        return ProfileUpdate.fromJson(result)
    }
    suspend fun capturePhoneConsent(accessToken: String, body: PhoneConsent): MaskedPhone {
        val result = api.request("/customer/profile/phone-consent", accessToken, "PUT", body = body.toJson())
        return MaskedPhone.fromJson(result)
    }
    suspend fun listAddresses(accessToken: String): Addresses {
        val result = api.request("/customer/addresses", accessToken, "GET")
        return Addresses.fromJson(result)
    }
    suspend fun createAddress(accessToken: String, idempotencyKey: String, body: AddressInput): Address {
        val result = api.request("/customer/addresses", accessToken, "POST", body = body.toJson(), idempotencyKey = idempotencyKey)
        return Address.fromJson(result)
    }
    suspend fun updateAddress(accessToken: String, id: String, body: AddressInput): Address {
        require(Regex("[0-9a-fA-F-]{36}").matches(id))
        val result = api.request("/customer/addresses/$id", accessToken, "PATCH", body = body.toJson())
        return Address.fromJson(result)
    }
    suspend fun deleteAddress(accessToken: String, id: String): Unit {
        require(Regex("[0-9a-fA-F-]{36}").matches(id))
        api.request("/customer/addresses/$id", accessToken, "DELETE")
    }
    suspend fun getCart(accessToken: String): Cart {
        val result = api.request("/customer/cart", accessToken, "GET")
        return Cart.fromJson(result)
    }
    suspend fun updateCart(accessToken: String, body: CartUpdate): Cart {
        val result = api.request("/customer/cart", accessToken, "PUT", body = body.toJson())
        return Cart.fromJson(result)
    }
}
