import Text "mo:base/Text";
import Char "mo:base/Char";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Debug "mo:base/Debug";

module {
  public type JSONValue = {
    #string : Text;
    #number : Float;
    #object : [(Text, JSONValue)];
    #array : [JSONValue];
    #bool : Bool;
    #null;
  };

  public func parse(json : Text) : JSONValue {
    let chars = Text.toIter(json);
    let firstChar = switch (chars.next()) {
      case (?c) { c };
      case (null) { Debug.trap("Empty JSON string") };
    };
    parseValue(firstChar, chars);
  };

  func parseValue(firstChar : Char, chars : Text.Iter) : JSONValue {
    switch (firstChar) {
      case ('"') { #string(parseString(chars)) };
      case ('{') { #object(parseObject(chars)) };
      case ('[') { #array(parseArray(chars)) };
      case ('t') { #bool(true) };
      case ('f') { #bool(false) };
      case ('n') { #null };
      case (c) {
        if (Char.isDigit(c) or c == '-') {
          #number(parseNumber(c, chars));
        } else {
          Debug.trap("Unexpected character: " # debug_show (c));
        };
      };
    };
  };

  func parseString(chars : Text.Iter) : Text {
    var result = "";
    var done = false;
    while (not done) {
      switch (chars.next()) {
        case (?'"') { done := true };
        case (?c) { result #= Char.toText(c) };
        case (null) { Debug.trap("Unterminated string") };
      };
    };
    result;
  };

  func parseNumber(firstChar : Char, chars : Text.Iter) : Float {
    var result = Char.toText(firstChar);
    var done = false;
    while (not done) {
      switch (chars.next()) {
        case (?c) {
          if (Char.isDigit(c) or c == '.' or c == 'e' or c == 'E' or c == '-' or c == '+') {
            result #= Char.toText(c);
          } else {
            done := true;
          };
        };
        case (null) { done := true };
      };
    };
    switch (Float.fromText(result)) {
      case (?f) { f };
      case (null) { Debug.trap("Invalid number: " # result) };
    };
  };

  func parseObject(chars : Text.Iter) : [(Text, JSONValue)] {
    var result : [(Text, JSONValue)] = [];
    var done = false;
    while (not done) {
      switch (chars.next()) {
        case (?'}') { done := true };
        case (?'"') {
          let key = parseString(chars);
          switch (chars.next()) {
            case (?:) {
              let value = parseValue(chars.next(), chars);
              result := result # [(key, value)];
            };
            case (null) { Debug.trap("Unterminated object") };
          };
        };
        case (?c) {
          if (not Char.isWhitespace(c)) {
            Debug.trap("Unexpected character in object: " # debug_show (c));
          };
        };
        case (null) { Debug.trap("Unterminated object") };
      };
    };
    result;
  };

  func parseArray(chars : Text.Iter) : [JSONValue] {
    var result : [JSONValue] = [];
    var done = false;
    while (not done) {
      switch (chars.next()) {
        case (?']') { done := true };
        case (?c) {
          result := result # [parseValue(c, chars)];
        };
        case (null) { Debug.trap("Unterminated array") };
      };
    };
    result;
  };
};
