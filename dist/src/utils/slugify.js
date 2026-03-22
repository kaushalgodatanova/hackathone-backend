"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = void 0;
// demo function for test case
const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
};
exports.slugify = slugify;
