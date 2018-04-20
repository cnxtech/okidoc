import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import renderHtmlAst from '../utils/renderHtmlAst';

import Navigation from '../components/Navigation';
import CatchDemoLinks from '../components/CatchDemoLinks';

const SIMPLE_LAYOUT = 'simple';
const COMPONENTS = process.env.GATSBY_DOCS_COMPONENTS
  ? require(process.env.GATSBY_DOCS_COMPONENTS)
  : {};

function Template({ match, location, data: { site, page } }) {
  if (!page && match.path === '/') {
    return (
      <div className="page-wrapper">
        For site index page create <code>./docs/index.md</code> file
      </div>
    );
  }

  const headings = page.headings;
  const htmlAst = page.htmlAst;

  const includes = page.frontmatter && page.frontmatter.include;
  const layout = (page.frontmatter && page.frontmatter.layout) || 'two-column';
  const isSimpleLayout = layout === SIMPLE_LAYOUT;

  if (includes) {
    includes.forEach(({ childMarkdownRemark }) => {
      headings.push(...childMarkdownRemark.headings);
      htmlAst.children.push(...childMarkdownRemark.htmlAst.children);
    });
  }

  return (
    <Fragment>
      <Navigation
        location={location}
        headings={headings}
        navigation={site.siteMetadata.navigation}
      />
      <div className={`page-wrapper ${layout}-layout`}>
        {!isSimpleLayout && <div className="dark-box" />}
        <CatchDemoLinks>
          <div className="content">
            {renderHtmlAst(htmlAst, { components: COMPONENTS })}
          </div>
        </CatchDemoLinks>
        {!isSimpleLayout && <div className="dark-box" />}
      </div>
    </Fragment>
  );
}

Template.propTypes = {
  location: PropTypes.any.isRequired,
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        navigation: PropTypes.array.isRequired,
      }),
    }),
    page: PropTypes.shape({
      headings: PropTypes.array.isRequired,
      htmlAst: PropTypes.object.isRequired,
    }),
  }),
};

export const siteFragment = graphql`
  fragment mdTemplateSiteFields on Site {
    siteMetadata {
      navigation {
        path
        title
      }
    }
  }
`;

export const markdownFragment = graphql`
  fragment mdTemplateMarkdownFields on MarkdownRemark {
    frontmatter {
      layout
      title
      include {
        childMarkdownRemark {
          headings {
            value
            depth
          }
          htmlAst
        }
      }
    }
    headings {
      depth
      value
    }
    htmlAst
  }
`;

export const query = graphql`
  query MarkdownPage($slug: String!) {
    site {
      ...mdTemplateSiteFields
    }
    page: markdownRemark(fields: { slug: { eq: $slug } }) {
      ...mdTemplateMarkdownFields
    }
  }
`;

export default Template;
