import 'node:http';

declare module 'node:http' {
    interface RequestOptions {
        /**
         * Supported by the Node.js 22 HTTP client socket layer, but omitted from
         * the currently installed @types/node RequestOptions declaration.
         */
        autoSelectFamily?: boolean;
    }
}
