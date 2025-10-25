import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Array "mo:base/Array";

module {
  // Simple JSON parser for extracting price values from proxy API responses
  // Handles responses from: https://envio-proxy-kevinc.pythonanywhere.com

  // Extract value from single price response
  // Format: {"success": true, "price": {"value": 111373, ...}}
  public func parseSinglePrice(json : Text) : ?Nat {
    // Find "value": followed by a number
    let valuePattern = "\"value\":";
    
    let parts = Iter.toArray(Text.split(json, #text valuePattern));
    if (parts.size() < 2) {
      return null;
    };
    
    let afterValue = parts[1];
    
    // Extract the number (until comma, closing brace, or space)
    var numStr = "";
    for (char in afterValue.chars()) {
      switch (char) {
        case ('0' or '1' or '2' or '3' or '4' or '5' or '6' or '7' or '8' or '9' or '.') {
          numStr #= Text.fromChar(char);
        };
        case (' ' or ',' or '}' or '\n' or '\r') {
          if (numStr != "") {
            // We've collected the number, stop here
            return textToNat(numStr);
          };
        };
        case _ {
          if (numStr != "") {
            // We hit a non-numeric char after collecting digits
            return textToNat(numStr);
          };
        };
      };
    };
    
    // Convert what we collected
    if (numStr != "") {
      textToNat(numStr);
    } else {
      null;
    };
  };

  // Extract value from multi-price response for a specific currency
  // Format: {"success": true, "prices": {"BTC": {"value": 111371, ...}}}
  public func parseMultiPrice(json : Text, currency : Text) : ?Nat {
    // Find the currency block: "BTC": {"value": or "BTC":{"value":
    let pattern1 = "\"" # currency # "\":{\"value\":";
    let pattern2 = "\"" # currency # "\": {\"value\":";
    let pattern3 = "\"" # currency # "\": { \"value\":";
    
    // Try different spacing patterns
    let patterns = [pattern1, pattern2, pattern3];
    
    for (pattern in patterns.vals()) {
      let parts = Iter.toArray(Text.split(json, #text pattern));
      if (parts.size() >= 2) {
        let afterPattern = parts[1];
        
        // Extract the number
        var numStr = "";
        for (char in afterPattern.chars()) {
          switch (char) {
            case ('0' or '1' or '2' or '3' or '4' or '5' or '6' or '7' or '8' or '9' or '.') {
              numStr #= Text.fromChar(char);
            };
            case (' ' or ',' or '}' or '\n' or '\r') {
              if (numStr != "") {
                return textToNat(numStr);
              };
            };
            case _ {
              if (numStr != "") {
                return textToNat(numStr);
              };
            };
          };
        };
        
        if (numStr != "") {
          return textToNat(numStr);
        };
      };
    };
    
    null;
  };

  // Parse any price response (tries both formats)
  public func parsePrice(json : Text, currency : Text) : ?Nat {
    // Try single price format first
    switch (parseSinglePrice(json)) {
      case (?price) { ?price };
      case null {
        // Try multi-price format
        parseMultiPrice(json, currency);
      };
    };
  };

  // Helper: Convert text to Nat (handles decimals by truncating)
  private func textToNat(text : Text) : ?Nat {
    if (text == "") { return null };
    
    // Split on decimal point if present
    let parts = Iter.toArray(Text.split(text, #char '.'));
    let intPart = parts[0];
    
    if (intPart == "") { return null };
    
    // Convert integer part to Nat
    var n : Nat = 0;
    for (char in intPart.chars()) {
      let digit = switch (char) {
        case '0' { 0 };
        case '1' { 1 };
        case '2' { 2 };
        case '3' { 3 };
        case '4' { 4 };
        case '5' { 5 };
        case '6' { 6 };
        case '7' { 7 };
        case '8' { 8 };
        case '9' { 9 };
        case _ { return null };
      };
      n := n * 10 + digit;
    };
    ?n;
  };

  // Check if response indicates success
  public func isSuccessResponse(json : Text) : Bool {
    Text.contains(json, #text "\"success\":true") or Text.contains(json, #text "\"success\": true");
  };
}
