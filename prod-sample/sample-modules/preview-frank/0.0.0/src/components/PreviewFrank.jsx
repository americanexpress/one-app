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

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { RenderModule, holocronModule } from 'holocron';
import { load } from '../duck';
import getDemoProps from '../utils/getDemoProps';

const PreviewFrank = (props) => {
  const { params, moduleToBeDemoedExists } = props;

  if (moduleToBeDemoedExists) {
    return (
      <RenderModule
        moduleName={params.moduleName}
        props={getDemoProps(props)}
      />
    );
  }

  return (
    <h2 className="text-align-center margin-title missingModuleMessage">
      Module
      {' '}
      <code className="font-weight-bold missingModuleName">{params.moduleName}</code>
      {' '}
      was not found in the holocron module registry or failed to load
    </h2>
  );
};

PreviewFrank.propTypes = {
  params: PropTypes.shape({
    moduleName: PropTypes.string.isRequired,
  }).isRequired,
  location: PropTypes.shape({ // eslint-disable-line react/no-unused-prop-types
    query: PropTypes.shape({
      props: PropTypes.string,
      locale: PropTypes.string,
    }).isRequired,
  }).isRequired,
  moduleToBeDemoedExists: PropTypes.bool.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  moduleToBeDemoedExists: state.hasIn(['holocron', 'loaded', ownProps.params.moduleName]),
});

const hocChain = compose(
  connect(mapStateToProps),
  holocronModule({
    name: 'preview-frank',
    load,
    options: { ssr: true },
  })
);

export default hocChain(PreviewFrank);
