/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { Helmet } from 'react-helmet';

import { renderForString, renderForStaticMarkup } from '../../../src/server/utils/reactRendering';

describe('reactRendering', () => {
  describe('renderForString', () => {
    it('is a function', () => expect(renderForString).toBeInstanceOf(Function));

    it('returns an object with "renderedString" and "helmetInfo" keys', () => {
      const HelloComponent = () => <p>Hello</p>;
      expect(renderForString(<HelloComponent />)).toEqual({
        renderedString: expect.any(String),
        helmetInfo: expect.any(Object),
      });
    });

    it('calls react-dom renderToString', () => {
      const HelloComponent = () => <p>Hello</p>;
      const renderResults = renderForString(<HelloComponent />);
      expect(renderResults).toHaveProperty('renderedString');
      expect(renderResults.renderedString).toMatchSnapshot('<p>Hello</p>');
    });

    it('does not use existing Helmet data for the render', () => {
      const PreviousRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-NZ',
                previous: 'render',
              },
              title: 'Page Title of Previous Render',
            }}
          />
          <h1>previous title</h1>
          <p>previous content</p>
        </div>
      );
      renderToString(<PreviousRender />);

      const IntendedRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-GB',
                intended: 'render',
              },
              title: 'Page Title of Intended Render',
            }}
          />
          <h1>intended title</h1>
          <p>intended content</p>
        </div>
      );
      const { helmetInfo } = renderForString(<IntendedRender />);

      expect(helmetInfo.title.toString()).toMatchSnapshot();
      expect(helmetInfo.htmlAttributes.toString()).toMatchSnapshot();
    });

    it('provides Helmet data of just the render', () => {
      const IntendedRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-GB',
                intended: 'render',
              },
              title: 'Page Title of Intended Render',
            }}
          />
          <h1>intended title</h1>
          <p>intended content</p>
        </div>
      );
      const { helmetInfo } = renderForString(<IntendedRender />);

      const NextRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-NZ',
                next: 'render',
              },
              title: 'Page Title of Next Render',
            }}
          />
          <h1>next title</h1>
          <p>next content</p>
        </div>
      );
      renderToString(<NextRender />);

      expect(helmetInfo.title.toString()).toMatchSnapshot();
      expect(helmetInfo.htmlAttributes.toString()).toMatchSnapshot();
    });
  });
  describe('renderForStaticMarkup', () => {
    it('is a function', () => expect(renderToStaticMarkup).toBeInstanceOf(Function));

    it('returns an object with "renderedString" and "helmetInfo" keys', () => {
      const HelloComponent = () => <p>Hello</p>;
      expect(renderForStaticMarkup(<HelloComponent />)).toEqual({
        renderedString: expect.any(String),
        helmetInfo: expect.any(Object),
      });
    });

    it('calls react-dom renderToStaticMarkup', () => {
      const HelloComponent = () => <p>Hello</p>;
      const renderResults = renderForStaticMarkup(<HelloComponent />);
      expect(renderResults).toHaveProperty('renderedString');
      expect(renderResults.renderedString).toMatchSnapshot('<p>Hello</p>');
    });

    it('does not use existing Helmet data for the render', () => {
      const PreviousRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-NZ',
                previous: 'render',
              },
              title: 'Page Title of Previous Render',
            }}
          />
          <h1>previous title</h1>
          <p>previous content</p>
        </div>
      );
      renderToStaticMarkup(<PreviousRender />);

      const IntendedRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-GB',
                intended: 'render',
              },
              title: 'Page Title of Intended Render',
            }}
          />
          <h1>intended title</h1>
          <p>intended content</p>
        </div>
      );
      const { helmetInfo } = renderForStaticMarkup(<IntendedRender />);

      expect(helmetInfo.title.toString()).toMatchSnapshot();
      expect(helmetInfo.htmlAttributes.toString()).toMatchSnapshot();
    });

    it('provides Helmet data of just the render', () => {
      const IntendedRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-GB',
                intended: 'render',
              },
              title: 'Page Title of Intended Render',
            }}
          />
          <h1>intended title</h1>
          <p>intended content</p>
        </div>
      );
      const { helmetInfo } = renderForStaticMarkup(<IntendedRender />);

      const NextRender = () => (
        <div>
          <Helmet
            {...{
              htmlAttributes: {
                lang: 'en-NZ',
                next: 'render',
              },
              title: 'Page Title of Next Render',
            }}
          />
          <h1>next title</h1>
          <p>next content</p>
        </div>
      );
      renderToStaticMarkup(<NextRender />);

      expect(helmetInfo.title.toString()).toMatchSnapshot();
      expect(helmetInfo.htmlAttributes.toString()).toMatchSnapshot();
    });
  });
});
