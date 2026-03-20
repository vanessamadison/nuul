/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("worker_threads");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(ssr)/./workers/ocrWorker.ts":
/*!******************************!*\
  !*** ./workers/ocrWorker.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tesseract.js */ \"(ssr)/./node_modules/tesseract.js/src/index.js\");\n/* harmony import */ var tesseract_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(tesseract_js__WEBPACK_IMPORTED_MODULE_0__);\n\nlet workerPromise = null;\nasync function getWorker() {\n    if (!workerPromise) {\n        workerPromise = (async ()=>{\n            const worker = await (0,tesseract_js__WEBPACK_IMPORTED_MODULE_0__.createWorker)({\n                workerPath: \"/tesseract/worker.min.js\",\n                langPath: \"/tesseract/lang-data\",\n                corePath: \"/tesseract/tesseract-core.wasm.js\"\n            });\n            await worker.load();\n            await worker.loadLanguage(\"eng\");\n            await worker.initialize(\"eng\");\n            return worker;\n        })();\n    }\n    return workerPromise;\n}\nself.onmessage = async (event)=>{\n    const { id, imageData, type } = event.data;\n    try {\n        const worker = await getWorker();\n        if (type === \"warmup\") {\n            self.postMessage({\n                id,\n                text: \"\"\n            });\n            return;\n        }\n        if (!imageData) {\n            self.postMessage({\n                id,\n                text: \"\"\n            });\n            return;\n        }\n        const result = await worker.recognize(imageData);\n        self.postMessage({\n            id,\n            text: result.data.text ?? \"\"\n        });\n    } catch (error) {\n        self.postMessage({\n            id,\n            error: error.message\n        });\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi93b3JrZXJzL29jcldvcmtlci50cyIsIm1hcHBpbmdzIjoiOzs7QUFBNEM7QUFFNUMsSUFBSUMsZ0JBQTBFO0FBRTlFLGVBQWVDO0lBQ2IsSUFBSSxDQUFDRCxlQUFlO1FBQ2xCQSxnQkFBZ0IsQ0FBQztZQUNmLE1BQU1FLFNBQVUsTUFBTUgsMERBQVlBLENBQUM7Z0JBQ2pDSSxZQUFZO2dCQUNaQyxVQUFVO2dCQUNWQyxVQUFVO1lBQ1o7WUFDQSxNQUFNSCxPQUFPSSxJQUFJO1lBQ2pCLE1BQU1KLE9BQU9LLFlBQVksQ0FBQztZQUMxQixNQUFNTCxPQUFPTSxVQUFVLENBQUM7WUFDeEIsT0FBT047UUFDVDtJQUNGO0lBQ0EsT0FBT0Y7QUFDVDtBQUVBUyxLQUFLQyxTQUFTLEdBQUcsT0FBT0M7SUFDdEIsTUFBTSxFQUFFQyxFQUFFLEVBQUVDLFNBQVMsRUFBRUMsSUFBSSxFQUFFLEdBQUdILE1BQU1JLElBQUk7SUFDMUMsSUFBSTtRQUNGLE1BQU1iLFNBQVMsTUFBTUQ7UUFDckIsSUFBSWEsU0FBUyxVQUFVO1lBQ3JCTCxLQUFLTyxXQUFXLENBQUM7Z0JBQUVKO2dCQUFJSyxNQUFNO1lBQUc7WUFDaEM7UUFDRjtRQUNBLElBQUksQ0FBQ0osV0FBVztZQUNkSixLQUFLTyxXQUFXLENBQUM7Z0JBQUVKO2dCQUFJSyxNQUFNO1lBQUc7WUFDaEM7UUFDRjtRQUNBLE1BQU1DLFNBQVMsTUFBTWhCLE9BQU9pQixTQUFTLENBQUNOO1FBQ3RDSixLQUFLTyxXQUFXLENBQUM7WUFBRUo7WUFBSUssTUFBTUMsT0FBT0gsSUFBSSxDQUFDRSxJQUFJLElBQUk7UUFBRztJQUN0RCxFQUFFLE9BQU9HLE9BQU87UUFDZFgsS0FBS08sV0FBVyxDQUFDO1lBQUVKO1lBQUlRLE9BQU8sTUFBaUJDLE9BQU87UUFBQztJQUN6RDtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vbnV1bC8uL3dvcmtlcnMvb2NyV29ya2VyLnRzPzAzYmMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlV29ya2VyIH0gZnJvbSBcInRlc3NlcmFjdC5qc1wiO1xuXG5sZXQgd29ya2VyUHJvbWlzZTogUHJvbWlzZTxBd2FpdGVkPFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVdvcmtlcj4+PiB8IG51bGwgPSBudWxsO1xuXG5hc3luYyBmdW5jdGlvbiBnZXRXb3JrZXIoKSB7XG4gIGlmICghd29ya2VyUHJvbWlzZSkge1xuICAgIHdvcmtlclByb21pc2UgPSAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgd29ya2VyID0gKGF3YWl0IGNyZWF0ZVdvcmtlcih7XG4gICAgICAgIHdvcmtlclBhdGg6IFwiL3Rlc3NlcmFjdC93b3JrZXIubWluLmpzXCIsXG4gICAgICAgIGxhbmdQYXRoOiBcIi90ZXNzZXJhY3QvbGFuZy1kYXRhXCIsXG4gICAgICAgIGNvcmVQYXRoOiBcIi90ZXNzZXJhY3QvdGVzc2VyYWN0LWNvcmUud2FzbS5qc1wiXG4gICAgICB9IGFzIGFueSkpIGFzIGFueTtcbiAgICAgIGF3YWl0IHdvcmtlci5sb2FkKCk7XG4gICAgICBhd2FpdCB3b3JrZXIubG9hZExhbmd1YWdlKFwiZW5nXCIpO1xuICAgICAgYXdhaXQgd29ya2VyLmluaXRpYWxpemUoXCJlbmdcIik7XG4gICAgICByZXR1cm4gd29ya2VyO1xuICAgIH0pKCk7XG4gIH1cbiAgcmV0dXJuIHdvcmtlclByb21pc2U7XG59XG5cbnNlbGYub25tZXNzYWdlID0gYXN5bmMgKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgY29uc3QgeyBpZCwgaW1hZ2VEYXRhLCB0eXBlIH0gPSBldmVudC5kYXRhIGFzIHsgaWQ6IHN0cmluZzsgaW1hZ2VEYXRhPzogSW1hZ2VEYXRhOyB0eXBlPzogc3RyaW5nIH07XG4gIHRyeSB7XG4gICAgY29uc3Qgd29ya2VyID0gYXdhaXQgZ2V0V29ya2VyKCk7XG4gICAgaWYgKHR5cGUgPT09IFwid2FybXVwXCIpIHtcbiAgICAgIHNlbGYucG9zdE1lc3NhZ2UoeyBpZCwgdGV4dDogXCJcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFpbWFnZURhdGEpIHtcbiAgICAgIHNlbGYucG9zdE1lc3NhZ2UoeyBpZCwgdGV4dDogXCJcIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya2VyLnJlY29nbml6ZShpbWFnZURhdGEpO1xuICAgIHNlbGYucG9zdE1lc3NhZ2UoeyBpZCwgdGV4dDogcmVzdWx0LmRhdGEudGV4dCA/PyBcIlwiIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNlbGYucG9zdE1lc3NhZ2UoeyBpZCwgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KTtcbiAgfVxufTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVXb3JrZXIiLCJ3b3JrZXJQcm9taXNlIiwiZ2V0V29ya2VyIiwid29ya2VyIiwid29ya2VyUGF0aCIsImxhbmdQYXRoIiwiY29yZVBhdGgiLCJsb2FkIiwibG9hZExhbmd1YWdlIiwiaW5pdGlhbGl6ZSIsInNlbGYiLCJvbm1lc3NhZ2UiLCJldmVudCIsImlkIiwiaW1hZ2VEYXRhIiwidHlwZSIsImRhdGEiLCJwb3N0TWVzc2FnZSIsInRleHQiLCJyZXN1bHQiLCJyZWNvZ25pemUiLCJlcnJvciIsIm1lc3NhZ2UiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./workers/ocrWorker.ts\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendor-chunks/tesseract.js","vendor-chunks/whatwg-url","vendor-chunks/tr46","vendor-chunks/node-fetch","vendor-chunks/webidl-conversions","vendor-chunks/regenerator-runtime","vendor-chunks/is-url","vendor-chunks/is-electron"], () => (__webpack_require__("(ssr)/./workers/ocrWorker.ts")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			"fs-http-https-path-punycode-stream-url-util-worker_threads-zlib-_ssr_workers_ocrWorker_ts": 1
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.O.require = (chunkId) => (installedChunks[chunkId]);
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 			__webpack_require__.O();
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			__webpack_require__.e("vendor-chunks/tesseract.js");
/******/ 			__webpack_require__.e("vendor-chunks/whatwg-url");
/******/ 			__webpack_require__.e("vendor-chunks/tr46");
/******/ 			__webpack_require__.e("vendor-chunks/node-fetch");
/******/ 			__webpack_require__.e("vendor-chunks/webidl-conversions");
/******/ 			__webpack_require__.e("vendor-chunks/regenerator-runtime");
/******/ 			__webpack_require__.e("vendor-chunks/is-url");
/******/ 			__webpack_require__.e("vendor-chunks/is-electron");
/******/ 			return next();
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;