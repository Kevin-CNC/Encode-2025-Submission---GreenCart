import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";
import JsonParser "json-parser";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Error "mo:base/Error";

actor ShopifyCryptoPlugin {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Logging toggle - set to false for production
  let enableLogging : Bool = true;

  // Logging function with log levels
  func log(level : Text, message : Text) : () {
    if (enableLogging) {
      let timestamp = Int.toText(Time.now());
      Debug.print("[" # level # "] [" # timestamp # "] " # message);
    };
  };

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    log("INFO", "Initializing access control for caller: " # Principal.toText(caller));
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    log("DEBUG", "Fetching user role for caller: " # Principal.toText(caller));
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    log("INFO", "Assigning role " # debug_show (role) # " to user: " # Principal.toText(user));
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    log("DEBUG", "Checking admin status for caller: " # Principal.toText(caller));
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    // Other user metadata if needed
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    log("DEBUG", "Fetching profile for caller: " # Principal.toText(caller));
    principalMap.get(userProfiles, caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    log("DEBUG", "Fetching profile for user: " # Principal.toText(user));
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    log("INFO", "Saving profile for caller: " # Principal.toText(caller));
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Merchant configuration
  public type MerchantConfig = {
    supportedCurrencies : [Text];
    preferredFiat : Text;
    minConfirmations : Nat;
    conversionSettings : Text;
  };

  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  var merchantConfigs = textMap.empty<MerchantConfig>();

  // Payment transaction
  public type PaymentTransaction = {
    id : Text;
    merchantId : Text;
    amount : Nat;
    currency : Text;
    status : Text;
    blockchainTxId : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  var paymentTransactions = textMap.empty<PaymentTransaction>();

  // Exchange rate history
  public type ExchangeRate = {
    currency : Text;
    rate : Nat;
    timestamp : Int;
  };

  var exchangeRates = textMap.empty<ExchangeRate>();

  // Concordium integration stubs
  public type ConcordiumConfig = {
    network : Text;
    privacySettings : Text;
  };

  var concordiumConfigs = textMap.empty<ConcordiumConfig>();

  // Envio HyperIndex integration stubs
  public type EnvioConfig = {
    apiKey : Text;
    endpoint : Text;
  };

  var envioConfigs = textMap.empty<EnvioConfig>();

  // Health check endpoint
  public query func healthCheck() : async Text {
    log("INFO", "Health check requested");
    "OK";
  };

  // Initialize merchant config
  public shared ({ caller }) func initializeMerchantConfig(merchantId : Text, config : MerchantConfig) : async () {
    log("INFO", "Initializing merchant config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    merchantConfigs := textMap.put(merchantConfigs, merchantId, config);
  };

  // Get merchant config
  public query ({ caller }) func getMerchantConfig(merchantId : Text) : async MerchantConfig {
    log("DEBUG", "Fetching merchant config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    switch (textMap.get(merchantConfigs, merchantId)) {
      case (?config) { config };
      case (null) {
        log("ERROR", "Merchant config not found for merchantId: " # merchantId);
        Debug.trap("Merchant config not found");
      };
    };
  };

  // Create payment transaction
  public shared ({ caller }) func createPaymentTransaction(transaction : PaymentTransaction) : async () {
    log("INFO", "Creating payment transaction with id: " # transaction.id);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    paymentTransactions := textMap.put(paymentTransactions, transaction.id, transaction);
  };

  // Update payment status
  public shared ({ caller }) func updatePaymentStatus(transactionId : Text, status : Text) : async () {
    log("INFO", "Updating payment status for transactionId: " # transactionId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    switch (textMap.get(paymentTransactions, transactionId)) {
      case (?transaction) {
        let updatedTransaction = {
          transaction with
          status;
          updatedAt = Time.now();
        };
        paymentTransactions := textMap.put(paymentTransactions, transactionId, updatedTransaction);
      };
      case (null) {
        log("ERROR", "Transaction not found for transactionId: " # transactionId);
        Debug.trap("Transaction not found");
      };
    };
  };

  // Fetch real-time exchange rates from Envio HyperIndex via proxy
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    log("DEBUG", "Transforming HTTP response");
    OutCall.transform(input);
  };

  // Helper function to try multiple endpoints
  func tryEndpoints(endpoints : [Text], transform : OutCall.Transform) : async Text {
    var lastError : ?Text = null;
    for (endpoint in endpoints.vals()) {
      log("INFO", "Trying endpoint: " # endpoint);
      try {
        let response = await OutCall.httpGetRequest(endpoint, [], transform);
        if (response != "") {
          log("INFO", "Successful response from endpoint: " # endpoint);
          return response;
        };
      } catch (e) {
        log("ERROR", "Error from endpoint " # endpoint # ": " # Error.message(e));
        lastError := ?Error.message(e);
      };
    };
    switch (lastError) {
      case (?error) {
        log("ERROR", "All endpoints failed. Last error: " # error);
        Debug.trap("All endpoints failed. Last error: " # error);
      };
      case (null) {
        log("ERROR", "All endpoints returned empty responses");
        Debug.trap("All endpoints returned empty responses");
      };
    };
  };

  public shared func fetchExchangeRates() : async Text {
    log("INFO", "Fetching exchange rates from multiple endpoints");
    let endpoints = [
      // Try with CoinGecko source first (most reliable)
      "https://envio-proxy-kevinc.pythonanywhere.com/prices?currencies=BTC,ETH,ICP,PLT&fiat=USD&source=coingecko",
      // Then try auto source (will attempt HyperIndex then fallback)
      "https://envio-proxy-kevinc.pythonanywhere.com/prices?currencies=BTC,ETH,ICP,PLT&fiat=USD&source=auto",
      // Finally just the basic endpoint
      "https://envio-proxy-kevinc.pythonanywhere.com/prices?currencies=BTC,ETH,ICP,PLT&fiat=USD",
    ];
    await tryEndpoints(endpoints, transform);
  };

  // Store exchange rate
  public shared ({ caller }) func storeExchangeRate(rate : ExchangeRate) : async () {
    log("INFO", "Storing exchange rate for currency: " # rate.currency);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    exchangeRates := textMap.put(exchangeRates, rate.currency, rate);
  };

  // Get payment transaction
  public query ({ caller }) func getPaymentTransaction(transactionId : Text) : async PaymentTransaction {
    log("DEBUG", "Fetching payment transaction with id: " # transactionId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    switch (textMap.get(paymentTransactions, transactionId)) {
      case (?transaction) { transaction };
      case (null) {
        log("ERROR", "Transaction not found for transactionId: " # transactionId);
        Debug.trap("Transaction not found");
      };
    };
  };

  // Get all transactions for a merchant
  public query ({ caller }) func getMerchantTransactions(merchantId : Text) : async [PaymentTransaction] {
    log("DEBUG", "Fetching transactions for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    Iter.toArray(
      Iter.filter(
        textMap.vals(paymentTransactions),
        func(transaction : PaymentTransaction) : Bool {
          transaction.merchantId == merchantId;
        },
      )
    );
  };

  // Concordium integration stubs
  public shared ({ caller }) func initializeConcordiumConfig(merchantId : Text, config : ConcordiumConfig) : async () {
    log("INFO", "Initializing Concordium config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    concordiumConfigs := textMap.put(concordiumConfigs, merchantId, config);
  };

  public query ({ caller }) func getConcordiumConfig(merchantId : Text) : async ConcordiumConfig {
    log("DEBUG", "Fetching Concordium config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    switch (textMap.get(concordiumConfigs, merchantId)) {
      case (?config) { config };
      case (null) {
        log("ERROR", "Concordium config not found for merchantId: " # merchantId);
        Debug.trap("Concordium config not found");
      };
    };
  };

  // Envio HyperIndex integration stubs
  public shared ({ caller }) func initializeEnvioConfig(merchantId : Text, config : EnvioConfig) : async () {
    log("INFO", "Initializing Envio config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    envioConfigs := textMap.put(envioConfigs, merchantId, config);
  };

  public query ({ caller }) func getEnvioConfig(merchantId : Text) : async EnvioConfig {
    log("DEBUG", "Fetching Envio config for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    switch (textMap.get(envioConfigs, merchantId)) {
      case (?config) { config };
      case (null) {
        log("ERROR", "Envio config not found for merchantId: " # merchantId);
        Debug.trap("Envio config not found");
      };
    };
  };

  // Concordium payment processing stub
  public shared ({ caller }) func processConcordiumPayment(merchantId : Text, amount : Nat, currency : Text) : async Text {
    log("INFO", "Processing Concordium payment for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    // Placeholder for Concordium payment processing logic
    "Concordium payment processing initiated";
  };

  // Envio HyperIndex API call stub
  public shared ({ caller }) func fetchBlockchainHistory(merchantId : Text, currency : Text) : async Text {
    log("INFO", "Fetching blockchain history for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    // Placeholder for Envio HyperIndex API call logic
    "Blockchain history fetched via Envio HyperIndex";
  };

  // Shopify plugin export endpoint
  public query func getShopifyPluginConfig(merchantId : Text) : async MerchantConfig {
    log("DEBUG", "Fetching Shopify plugin config for merchantId: " # merchantId);
    switch (textMap.get(merchantConfigs, merchantId)) {
      case (?config) { config };
      case (null) {
        log("ERROR", "Merchant config not found for merchantId: " # merchantId);
        Debug.trap("Merchant config not found");
      };
    };
  };

  // Calculate total confirmed transaction value for a merchant
  public query ({ caller }) func getTotalConfirmedValue(merchantId : Text) : async Nat {
    log("DEBUG", "Calculating total confirmed value for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    var total : Nat = 0;
    for (transaction in textMap.vals(paymentTransactions)) {
      if (transaction.merchantId == merchantId and transaction.status == "confirmed") {
        total += transaction.amount;
      };
    };
    total;
  };

  // Calculate total pending transaction value for a merchant
  public query ({ caller }) func getTotalPendingValue(merchantId : Text) : async Nat {
    log("DEBUG", "Calculating total pending value for merchantId: " # merchantId);
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      log("ERROR", "Unauthorized access attempt by caller: " # Principal.toText(caller));
      Debug.trap("Unauthorized: Only admins can perform this action");
    };

    var total : Nat = 0;
    for (transaction in textMap.vals(paymentTransactions)) {
      if (transaction.merchantId == merchantId and transaction.status == "pending") {
        total += transaction.amount;
      };
    };
    total;
  };

  // Get live conversion rate from multiple endpoints with proper fallback
  public shared func getLiveConversionRate(currency : Text) : async Nat {
    log("INFO", "Fetching live conversion rate for currency: " # currency);
    
    // Try multiple endpoint formats in order of preference
    let endpoints = [
      // First try the single price endpoint (most reliable format)
      "https://envio-proxy-kevinc.pythonanywhere.com/price/" # currency # "?fiat=USD",
      // Then try the multi-price endpoint with CoinGecko source (most reliable)
      "https://envio-proxy-kevinc.pythonanywhere.com/prices?currencies=" # currency # "&fiat=USD&source=coingecko",
      // Fallback to auto source
      "https://envio-proxy-kevinc.pythonanywhere.com/prices?currencies=" # currency # "&fiat=USD",
    ];
    
    let response = await tryEndpoints(endpoints, transform);

    // Check if we got a response
    if (response == "") {
      log("ERROR", "All endpoints failed for currency: " # currency);
      // Return reasonable fallback prices
      return getFallbackPrice(currency);
    };

    // Log the response for debugging
    log("DEBUG", "API Response for " # currency # ": " # response);

    // Parse the JSON response to extract the price
    switch (JsonParser.parsePrice(response, currency)) {
      case (?price) {
        log("INFO", "Successfully parsed price for " # currency # ": " # Nat.toText(price));
        price;
      };
      case null {
        log("WARNING", "Failed to parse JSON response, using fallback price");
        log("DEBUG", "Response was: " # response);
        getFallbackPrice(currency);
      };
    };
  };

  // Helper function to get fallback prices
  private func getFallbackPrice(currency : Text) : Nat {
    switch (currency) {
      case "BTC" { 100000 }; // ~$100k
      case "ETH" { 4000 };   // ~$4k
      case "ICP" { 3 };      // ~$3
      case "PLT" { 1 };      // ~$1 (stablecoin)
      case _ { 1 };          // Default fallback
    };
  };

  // Convert amount using live rate
  public shared func convertAmount(amount : Nat, currency : Text) : async Nat {
    log("INFO", "Converting amount: " # Nat.toText(amount) # " " # currency);
    let rate = await getLiveConversionRate(currency);
    amount * rate;
  };

  // Initialize default merchant config if not present
  public shared func initializeDefaultMerchantConfig() : async () {
    let defaultMerchantId = "default-merchant";
    switch (textMap.get(merchantConfigs, defaultMerchantId)) {
      case (?_) {
        log("INFO", "Default merchant config already exists");
      };
      case (null) {
        let defaultConfig : MerchantConfig = {
          supportedCurrencies = ["BTC", "ETH", "ICP", "PLT"];
          preferredFiat = "USD";
          minConfirmations = 3;
          conversionSettings = "HyperIndex";
        };
        merchantConfigs := textMap.put(merchantConfigs, defaultMerchantId, defaultConfig);
        log("INFO", "Default merchant config created for merchantId: " # defaultMerchantId);
      };
    };
  };
};

