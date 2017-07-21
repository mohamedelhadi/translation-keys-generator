# translation-keys-generator
Generate typescript interface for a given json translation table

This generator is used in conjunction with [value-to-keys](https://github.com/mohamedelhadi/values-to-keys)
to achieve auto completion and type-checking when dealing with translations.

**Example**
say you have a json translation table as below (en.json)
```
{
  "Common": {
    "NoMatch": "No match"
  }
}
```
you can get the translation like so
```javascript
translate.get(Keys.Common.NoMatch); // Keys.Common.NoMatch will result in "Common.NoMatch"
```
or inside the view
```javascript
<span> {{ Keys.Common.NoMatch | translate }} </span>
```

Note that the example above assume you are using a translation library that supports namespaces in keys (e.g. [ngx-translate](https://github.com/ngx-translate))

## How to use
### Step 1: Prepare the translation interface
> npm install --save-dev translation-keys-generator

then add a script that executes the following
```javascript
import { generator } from "translation-keys-generator";
generator.generateAsFile({ json: "en.json", path: "translation.interface.d.ts" });
```
that will provide us with an interface that matches our translation table, the interface will help us get auto-completion.

**Note** the generator belongs to the build process, you shouldn't include it in your app.

### Step 2: Prepare the translation keys
We'll basically take the en.json, loop through all the values and replace them with keys.

In our example above, if we were to:
```javascript
import { default as translationTable } from "en.json";
console.log(translationTable.Common.NoMatch); // outputs "No match"
```
It will output "No match", so what need to do is replace "No match" with "NoMatch".

For that install the following
>npm install --save values-to-keys

Then add a .ts file that contains the following (this file should be bundled with your app)
```typescript
import { replace } from "values-to-keys";
import { default as translationTable } from "en.json";
import { ITranslationKeys } from "translation.interface"; // the interface we generated in step 1

replace(translationTable);
export const TranslationKeys = translationTable as ITranslationKeys;
```
### Step 3: Use the translation keys
Now import the TranslationKeys constant in other classes and enjoy the auto completion.
```typescript
import { TranslationKeys as Keys } from "keys.ts";
translateService.get(Keys.Common.Great);
```
- - - -
License MIT.