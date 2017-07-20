import isObject = require("lodash/isObject");
import isArray = require("lodash/isArray");
import isDate = require("lodash/isDate");
import isString = require("lodash/isString");
import isBoolean = require("lodash/isBoolean");
import isNumber = require("lodash/isNumber");
import isEqual = require("lodash/isEqual");
import every = require("lodash/every");
import partial = require("lodash/partial");
import includes = require("lodash/includes");

import * as fs from "fs";

export class Generator {

    /**
     * 
     * @param json the source that contains the json data, can either be a an javascript object, a file path or a json string
     * @param pascalNaming if true will output properties in pascalCase format otherwise will output in camelCase format
     * @param rootInterface the parent interface that holds the sub translation keys
     * @return the translation interfaces as string
     */
    public generateAsString(json: string | object, pascalNaming: boolean = true, rootInterface: string = "ITranslationKeys"): string {
        if (typeof json === "string" || json instanceof String) {
            // json can either be a json string or a path for a file that contains json data
            const content = this.toObject(json);
            return this.convertObjectToTsInterfaces(content, pascalNaming, rootInterface);
        }
        // json is an object
        return this.convertObjectToTsInterfaces(json, pascalNaming, rootInterface);
    }

    /**
     * 
     * @param param0 accepts an options object: json, path, rootInterface, pascalNaming
     */
    public generateAsFile({ json, path, rootInterface = "ITranslationKeys", pascalNaming = true }: { json: string | object, path: string, rootInterface?: string, pascalNaming?: boolean }) {
        const result = this.generateAsString(json, pascalNaming, rootInterface);
        fs.writeFileSync(path, result);
    }

    private toObject(src) {
        if (src.length > 5 && src.slice(-5).toLowerCase() === ".json") {
            src = fs.readFileSync(src);
        }
        try {
            return JSON.parse(src);
        } catch (e) {
            throw new Error(`Failed to parse content into json, verify that the content is formatted properly.\ncontent: ${src}`);
        }
    }

    private convertObjectToTsInterfaces(jsonContent: any, pascalNaming: boolean, rootInterface: string): string {
        let optionalKeys: string[] = [];
        let objectResult: string[] = [];

        for (let key in jsonContent) {
            let value = jsonContent[key];

            if (isObject(value) && !isArray(value)) {
                let childObjectName = this.toUpperFirstLetter(key);
                objectResult.push(this.convertObjectToTsInterfaces(value, pascalNaming, childObjectName));
                jsonContent[key] = childObjectName + ";";
            } else if (isArray(value)) {
                let arrayTypes: any = this.detectMultiArrayTypes(value);

                if (this.isMultiArray(arrayTypes)) {
                    let multiArrayBrackets = this.getMultiArrayBrackets(value);

                    if (this.isAllEqual(arrayTypes)) {
                        jsonContent[key] = arrayTypes[0].replace("[]", multiArrayBrackets);
                    } else {
                        jsonContent[key] = "any" + multiArrayBrackets + ";";
                    }
                } else if (value.length > 0 && isObject(value[0])) {
                    let childObjectName = this.toUpperFirstLetter(key);
                    objectResult.push(this.convertObjectToTsInterfaces(value[0], pascalNaming, childObjectName));
                    jsonContent[key] = childObjectName + "[];";
                } else {
                    jsonContent[key] = arrayTypes[0];
                }
            } else if (isDate(value)) {
                jsonContent[key] = "Date;";
            } else if (isString(value)) {
                jsonContent[key] = "string;";
            } else if (isBoolean(value)) {
                jsonContent[key] = "boolean;";
            } else if (isNumber(value)) {
                jsonContent[key] = "number;";
            } else {
                jsonContent[key] = "any;";
                optionalKeys.push(key);
            }
        }

        let result = this.formatCharsToTypeScript(jsonContent, pascalNaming, rootInterface, optionalKeys);
        objectResult.push(result);

        return objectResult.join("\n\n");
    }

    private detectMultiArrayTypes(value: any, valueType: string[] = []): string[] {
        if (isArray(value)) {
            if (value.length === 0) {
                valueType.push("any[];");
            } else if (isArray(value[0])) {
                for (let index = 0, length = value.length; index < length; index++) {
                    let element = value[index];

                    let valueTypeResult = this.detectMultiArrayTypes(element, valueType);
                    valueType.concat(valueTypeResult);
                }
            } else if (every(value, isString)) {
                valueType.push("string[];");
            } else if (every(value, isNumber)) {
                valueType.push("number[];");
            } else if (every(value, isBoolean)) {
                valueType.push("boolean[];");
            } else {
                valueType.push("any[];");
            }
        }

        return valueType;
    }

    private isMultiArray(arrayTypes: string[]) {
        return arrayTypes.length > 1;
    }

    private isAllEqual(array: string[]) {
        return every(array.slice(1), partial(isEqual, array[0]));
    }

    private getMultiArrayBrackets(content: any): string {
        let jsonString = JSON.stringify(content);
        let brackets = "";

        for (let index = 0, length = jsonString.length; index < length; index++) {
            let element = jsonString[index];

            if (element === "[") {
                brackets = brackets + "[]";
            } else {
                index = length;
            }
        }

        return brackets;
    }

    private formatCharsToTypeScript(jsonContent: any, pascalNaming: boolean, root: string, optionalKeys: string[]): string {
        let result = JSON.stringify(jsonContent, null, "\t")
            .replace(new RegExp("\"", "g"), "")
            .replace(new RegExp(",", "g"), "");

        let allKeys = Object.keys(jsonContent);
        for (let index = 0, length = allKeys.length; index < length; index++) {
            let key = allKeys[index];
            const casedKey = pascalNaming ? this.toUpperFirstLetter(key) : this.toLowerFirstLetter(key);
            if (includes(optionalKeys, key)) {
                result = result.replace(new RegExp(key + ":", "g"), casedKey + "?:");
            } else {
                result = result.replace(new RegExp(key + ":", "g"), casedKey + ":");
            }
        }

        return "export interface " + root + " " + result;
    }

    private toUpperFirstLetter(text: string) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    private toLowerFirstLetter(text: string) {
        return text.charAt(0).toLowerCase() + text.slice(1);
    }
}