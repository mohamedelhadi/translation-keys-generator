"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var isObject = require("lodash/isObject");
var isArray = require("lodash/isArray");
var isDate = require("lodash/isDate");
var isString = require("lodash/isString");
var isBoolean = require("lodash/isBoolean");
var isNumber = require("lodash/isNumber");
var partial = require("lodash/partial");
var isEqual = require("lodash/isEqual");
var includes = require("lodash/includes");
var lang_1 = require("lodash/lang");
var fs = require("fs");
var Generator = (function () {
    function Generator() {
    }
    /**
     *
     * @param json the source that contains the json data, can either be a an javascript object, a file path or a json string
     * @param pascalNaming if true will output properties in pascalCase format otherwise will output in camelCase format
     * @param rootInterface the parent interface that holds the sub translation keys
     * @return the translation interfaces as string
     */
    Generator.prototype.generateAsString = function (json, pascalNaming, rootInterface) {
        if (pascalNaming === void 0) { pascalNaming = true; }
        if (rootInterface === void 0) { rootInterface = "ITranslationKeys"; }
        if (typeof json === "string" || json instanceof String) {
            // json can either be a json string or a path for a file that contains json data
            var content = this.toObject(json);
            return this.convertObjectToTsInterfaces(content, pascalNaming, rootInterface);
        }
        // json is an object
        return this.convertObjectToTsInterfaces(json, pascalNaming, rootInterface);
    };
    /**
     *
     * @param param0 accepts an options object: json, path, rootInterface, pascalNaming
     */
    Generator.prototype.generateAsFile = function (_a) {
        var json = _a.json, path = _a.path, _b = _a.rootInterface, rootInterface = _b === void 0 ? "ITranslationKeys" : _b, _c = _a.pascalNaming, pascalNaming = _c === void 0 ? true : _c;
        var result = this.generateAsString(json, pascalNaming, rootInterface);
        fs.writeFileSync(path, result);
    };
    Generator.prototype.toObject = function (src) {
        if (src.length > 5 && src.slice(-5).toLowerCase() === ".json") {
            src = fs.readFileSync(src);
        }
        try {
            return JSON.parse(src);
        }
        catch (e) {
            throw new Error("Failed to parse content into json, verify that the content is formatted properly.\ncontent: " + src);
        }
    };
    Generator.prototype.convertObjectToTsInterfaces = function (jsonContent, pascalNaming, rootInterface) {
        var optionalKeys = [];
        var objectResult = [];
        for (var key in jsonContent) {
            var value = jsonContent[key];
            if (isObject(value) && !isArray(value)) {
                var childObjectName = this.toUpperFirstLetter(key);
                objectResult.push(this.convertObjectToTsInterfaces(value, pascalNaming, childObjectName));
                jsonContent[key] = childObjectName + ";";
            }
            else if (isArray(value)) {
                var arrayTypes = this.detectMultiArrayTypes(value);
                if (this.isMultiArray(arrayTypes)) {
                    var multiArrayBrackets = this.getMultiArrayBrackets(value);
                    if (this.isAllEqual(arrayTypes)) {
                        jsonContent[key] = arrayTypes[0].replace("[]", multiArrayBrackets);
                    }
                    else {
                        jsonContent[key] = "any" + multiArrayBrackets + ";";
                    }
                }
                else if (value.length > 0 && isObject(value[0])) {
                    var childObjectName = this.toUpperFirstLetter(key);
                    objectResult.push(this.convertObjectToTsInterfaces(value[0], pascalNaming, childObjectName));
                    jsonContent[key] = childObjectName + "[];";
                }
                else {
                    jsonContent[key] = arrayTypes[0];
                }
            }
            else if (isDate(value)) {
                jsonContent[key] = "Date;";
            }
            else if (isString(value)) {
                jsonContent[key] = "string;";
            }
            else if (isBoolean(value)) {
                jsonContent[key] = "boolean;";
            }
            else if (isNumber(value)) {
                jsonContent[key] = "number;";
            }
            else {
                jsonContent[key] = "any;";
                optionalKeys.push(key);
            }
        }
        var result = this.formatCharsToTypeScript(jsonContent, pascalNaming, rootInterface, optionalKeys);
        objectResult.push(result);
        return objectResult.join("\n\n");
    };
    Generator.prototype.detectMultiArrayTypes = function (value, valueType) {
        if (valueType === void 0) { valueType = []; }
        if (isArray(value)) {
            if (value.length === 0) {
                valueType.push("any[];");
            }
            else if (isArray(value[0])) {
                for (var index = 0, length_1 = value.length; index < length_1; index++) {
                    var element = value[index];
                    var valueTypeResult = this.detectMultiArrayTypes(element, valueType);
                    valueType.concat(valueTypeResult);
                }
            }
            else if (lang_1.default(value, isString)) {
                valueType.push("string[];");
            }
            else if (lang_1.default(value, isNumber)) {
                valueType.push("number[];");
            }
            else if (lang_1.default(value, isBoolean)) {
                valueType.push("boolean[];");
            }
            else {
                valueType.push("any[];");
            }
        }
        return valueType;
    };
    Generator.prototype.isMultiArray = function (arrayTypes) {
        return arrayTypes.length > 1;
    };
    Generator.prototype.isAllEqual = function (array) {
        return lang_1.default(array.slice(1), partial(isEqual, array[0]));
    };
    Generator.prototype.getMultiArrayBrackets = function (content) {
        var jsonString = JSON.stringify(content);
        var brackets = "";
        for (var index = 0, length_2 = jsonString.length; index < length_2; index++) {
            var element = jsonString[index];
            if (element === "[") {
                brackets = brackets + "[]";
            }
            else {
                index = length_2;
            }
        }
        return brackets;
    };
    Generator.prototype.formatCharsToTypeScript = function (jsonContent, pascalNaming, root, optionalKeys) {
        var result = JSON.stringify(jsonContent, null, "\t")
            .replace(new RegExp("\"", "g"), "")
            .replace(new RegExp(",", "g"), "");
        var allKeys = Object.keys(jsonContent);
        for (var index = 0, length_3 = allKeys.length; index < length_3; index++) {
            var key = allKeys[index];
            var casedKey = pascalNaming ? this.toUpperFirstLetter(key) : this.toLowerFirstLetter(key);
            if (includes(optionalKeys, key)) {
                result = result.replace(new RegExp(key + ":", "g"), casedKey + "?:");
            }
            else {
                result = result.replace(new RegExp(key + ":", "g"), casedKey + ":");
            }
        }
        return "export interface " + root + " " + result;
    };
    Generator.prototype.toUpperFirstLetter = function (text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    };
    Generator.prototype.toLowerFirstLetter = function (text) {
        return text.charAt(0).toLowerCase() + text.slice(1);
    };
    return Generator;
}());
exports.Generator = Generator;
//# sourceMappingURL=generator.js.map