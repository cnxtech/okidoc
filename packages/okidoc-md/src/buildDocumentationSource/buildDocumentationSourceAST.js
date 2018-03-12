import fs from 'fs';
import path from 'path';
import traverseSource from '../utils/traverseSource';
import traverseEntries from '../utils/traverseEntries';
import traverseFiles from '../utils/traverseFiles';
import {
  createApiVisitor,
  createApiMethod,
  createApiFunction,
  createApiInterface,
  buildApiClassDeclaration,
} from '../api';

function ensureSourceOptionsValid({ entry, pattern, source }) {
  if (!entry && !pattern && !source) {
    throw new Error(
      `'entry' or/and 'pattern' or 'source' options should be defined`,
    );
  }

  if (source && (entry || pattern)) {
    throw new Error(
      `if 'source' options provided, 'entry' and 'pattern' should be undefined`,
    );
  }
}

function ensureVisitorExists(apiVisitorPath) {
  if (!fs.existsSync(apiVisitorPath)) {
    throw new Error(
      `'visitor' option should be valid js file path. '${apiVisitorPath}' is not exists`,
    );
  }
}

function ensureCreateApiVisitorIsFunction(createCustomApiVisitor) {
  if (typeof createCustomApiVisitor !== 'function') {
    throw new Error(
      `'visitor' file should export function 'createApiVisitor' (exports.createApiVisitor = ...)`,
    );
  }
}

function ensureCustomApiVisitorIsCorrect(
  visitors,
  customApiVisitor,
  visitorPath,
) {
  const visitorsKeys = Object.keys(visitors);
  const customApiVisitorKeys = Object.keys(customApiVisitor);
  const intersection = customApiVisitorKeys.filter(key =>
    visitorsKeys.includes(key),
  );

  if (intersection.length) {
    console.error(
      `default config visitors ${JSON.stringify(
        intersection,
      )} are overridden by config from 'visitor.createApiVisitor' (${visitorPath})`,
    );
  }
}

function traverse({ entry, pattern, source }, visitors) {
  if (source) {
    traverseSource(source, visitors);
    return;
  }

  if (entry) {
    traverseEntries(entry, visitors, { pattern });
    return;
  }

  traverseFiles(pattern, visitors);
}

function buildDocumentationSourceAST({
  entry,
  pattern,
  source,
  tag,
  visitor: visitorPath,
}) {
  const apiInterfaces = [];
  const classApiMethods = [];
  const functions = [];

  ensureSourceOptionsValid({ entry, pattern, source });

  if (!tag && !visitorPath) {
    throw new Error(
      `'tag' or/and 'visitor' options should be defined ('${pattern}')`,
    );
  }

  // NOTE: read about visitors
  // https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-visitors
  // https://github.com/babel/babel/blob/master/packages/babel-traverse/src/visitors.js
  const visitors = {
    'InterfaceDeclaration|TSInterfaceDeclaration': path => {
      apiInterfaces.push(createApiInterface(path.node));
    },
  };

  if (tag) {
    Object.assign(
      visitors,
      createApiVisitor(tag, (path, options) => {
        if (path.isClassMethod() || path.isClassProperty(path)) {
          classApiMethods.push(createApiMethod(path.node, path, options));
        }

        if (
          path.isFunctionDeclaration() ||
          path.isFunctionExpression() ||
          path.isArrowFunctionExpression()
        ) {
          functions.push(createApiFunction(path.node, path, options));
        }
      }),
    );
  }

  if (visitorPath) {
    visitorPath = path.resolve(visitorPath);

    ensureVisitorExists(visitorPath);

    const {
      createApiVisitor: createCustomApiVisitor,
      createApiMethod: createCustomApiMethod,
      createApiFunction: createCustomApiFunction,
    } = require(visitorPath);

    ensureCreateApiVisitorIsFunction(createCustomApiVisitor);

    const customApiVisitor = createCustomApiVisitor((path, options) => {
      if (path.isClassMethod() || path.isClassProperty()) {
        classApiMethods.push(
          typeof createCustomApiMethod === 'function'
            ? createCustomApiMethod(path.node, path, options)
            : createApiMethod(path.node, path, options),
        );
      }

      if (
        path.isFunctionDeclaration() ||
        path.isFunctionExpression() ||
        path.isArrowFunctionExpression()
      ) {
        functions.push(
          typeof createCustomApiFunction === 'function'
            ? createCustomApiFunction(path.node, path, options)
            : createApiFunction(path.node, path, options),
        );
      }
    });

    ensureCustomApiVisitorIsCorrect(visitors, customApiVisitor, visitorPath);

    Object.assign(visitors, customApiVisitor);
  }

  traverse({ entry, pattern, source }, visitors);

  const apiClassDeclaration = buildApiClassDeclaration(classApiMethods);

  return {
    type: 'Program',
    body: apiInterfaces.concat(apiClassDeclaration, functions),
  };
}

export default buildDocumentationSourceAST;