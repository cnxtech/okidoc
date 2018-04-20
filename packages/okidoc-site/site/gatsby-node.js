const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.onCreateNode = ({ node, getNode, boundActionCreators }) => {
  const { createNodeField } = boundActionCreators;
  const parentNode = getNode(node.parent);

  if (
    node.internal.type === `MarkdownRemark` &&
    parentNode.internal.type === `File`
  ) {
    let slug = createFilePath({ node: parentNode, getNode, basePath: `pages` });

    if (parentNode.sourceInstanceName !== 'docs') {
      slug = `/${parentNode.sourceInstanceName}${slug}`;
    }

    createNodeField({
      node,
      name: `slug`,
      value: slug,
    });
  }
};

exports.createPages = ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators;

  return graphql(`
    {
      allFile {
        edges {
          node {
            sourceInstanceName
            childMarkdownRemark {
              fields {
                slug
              }
            }
          }
        }
      }
    }
  `).then(({ errors, data }) => {
    if (errors) {
      return Promise.reject(errors);
    }

    data.allFile.edges.forEach(({ node }) => {
      if (node.childMarkdownRemark) {
        const markdown = node.childMarkdownRemark;
        // const isDocs = node.sourceInstanceName === 'docs';
        // const templatePath = `./src/templates/${isDocs ? 'docs-md' : 'md'}.js`;
        const templatePath = './src/templates/md.js';

        createPage({
          path: markdown.fields.slug,
          component: path.resolve(templatePath),
          context: {
            // Data passed to context is available in page queries as GraphQL variables.
            slug: markdown.fields.slug,
          },
        });
      }
    });
  });
};

// TODO: review when issue resolved https://github.com/gatsbyjs/gatsby/issues/2792#issuecomment-361944910
exports.modifyWebpackConfig = ({ config }) => {
  const sourceToTranspile = [
    new RegExp(process.cwd() + '/src'),
    new RegExp(process.cwd() + '/.cache'),
  ];

  if (process.env.GATSBY_DOCS_COMPONENTS) {
    sourceToTranspile.push(process.env.GATSBY_DOCS_COMPONENTS);
  }

  config._loaders.js.config.include = sourceToTranspile;
  config._loaders.js.config.exclude = undefined;
};
