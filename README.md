# RN-edison-editor

## Secondary development of this package

---

### if you want change the `index.html`(webview content):

#### 1. install the dependencies

`yarn`

#### 2. run react app

- `yarn dev` to start react app in localhost
- or `yarn dev-with-host` to start in host and can visit it in other device by IP address

#### 3. change webview uri

change the code in file `{your project}/node_modules/RN-edison-editor/index.js`

find this code:

```
this.setState({ webviewUri: draftJsFilePath });
```

change the webviewUri to your local url: `http://localhost:8080` or `http://192.168.1.123:8080`

#### 4. finish change and build

`yarn build`

#### 5. publish

`npm run publish`

---

### if you want change the `index.js` or `index.d.ts`(webview shell):

#### 1. copy the `index.tsx` to node_modules in you project

```shell
cp ./index.tsx {your project}/node_modules/RN-edison-editor/
```

#### 2. change the main in package.json

change the `main` in `node_modules/RN-edison-editor/package.json` to `"index.tsx"` and delete `"types": "index.d.ts"`

#### 3. finish change and build

copy `index.tsx` change code to RN-edison-editor,

`yarn build`

#### 4. publish

`npm run publish`

### if you want change the quill package:

#### 1. change the `node_modules/quill/dist/quill.js`

#### 2. generate diff patches

`npx patch-package quill`

## Get Start

[Get Start](./doc/Getting-Started.md)
