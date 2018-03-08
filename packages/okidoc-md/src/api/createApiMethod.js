import * as t from '@babel/types';
import { getJSDocComment } from '../utils/JSDocAST';
import { removeNodeDecorators, removeNodeBody } from '../utils/nodeAST';

import cleanUpNodeJSDoc from './cleanUpNodeJSDoc';

function createApiMethod(
  node,
  path,
  { docTag, JSDocComment, identifierName } = {},
) {
  JSDocComment = JSDocComment || getJSDocComment(node);

  if (identifierName) {
    node.key = t.identifier(identifierName);
  }

  cleanUpNodeJSDoc(node, JSDocComment, { docTag });
  removeNodeDecorators(node);
  removeNodeBody(node);

  return node;
}

export default createApiMethod;
