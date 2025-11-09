const fs = require("fs");
const path = require("path");
const Module = require("module");

// Override to handle ?raw imports
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
    if (request.endsWith("?raw")) {
        const actualRequest = request.slice(0, -4);
        return originalResolveFilename.call(this, actualRequest, parent, isMain);
    }
    return originalResolveFilename.call(this, request, parent, isMain);
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request.endsWith("?raw")) {
        const actualRequest = request.slice(0, -4);
        const filename = Module._resolveFilename(actualRequest, parent, isMain);
        return fs.readFileSync(filename, "utf8");
    }
    return originalLoad.call(this, request, parent, isMain);
};

// Register .vm, .css extensions to return raw content
// [".vm", ".css"].forEach(ext => {
//     require.extensions[ext] = (module, filename) => {
//         module.exports = fs.readFileSync(filename, "utf8");
//     };
// });

require("ts-node").register({
    compilerOptions: {
        target: "es2015",
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "commonjs",
        moduleResolution: "node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "preserve",
        noUnusedParameters: false,
        noUnusedLocals: false,
        experimentalDecorators: true,
        lib: ["dom", "dom.iterable", "esnext"],
        baseUrl: path.join(__dirname, ".."),
        paths: {
            "$/*": ["./*"],
        },
    },
    transpileOnly: true,
    ignore: ["/node_modules/"],
});

require("./resave-datasets.ts");
