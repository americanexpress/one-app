/*
 * Copyright 2020 American Express Travel Related Services Company, Inc.
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

import Joi from 'joi';

// eslint-disable-next-line import/prefer-default-export
export const webManifestSchema = Joi.object().keys({
  name: Joi.string().required(),
  short_name: Joi.string(),
  description: Joi.string(),
  lang: Joi.string(),
  scope: Joi.string().pattern(/^\//),
  start_url: Joi.alternatives(
    Joi.string().uri(),
    Joi.string().pattern(/^\//)
  ),
  theme_color: Joi.alternatives(
    Joi.string(),
    Joi.string().hex()
  ),
  background_color: Joi.alternatives(
    Joi.string(),
    Joi.string().hex()
  ),
  categories: Joi.array().items(Joi.string()),
  iarc_rating_id: Joi.boolean(),
  prefer_related_applications: Joi.boolean(),
  related_applications: Joi.array().items(Joi.object().keys({
    platform: Joi.string(),
    url: Joi.string().uri(),
    id: Joi.string(),
  })),
  orientation: Joi.string().valid(
    'any',
    'natural',
    'landscape',
    'landscape-primary',
    'landscape-secondary',
    'portrait',
    'portrait-primary',
    'portrait-secondary'
  ),
  display: Joi.string()
    .valid(
      'fullscreen',
      'standalone',
      'minimal-ui',
      'browser'
    ),
  dir: Joi.string().valid(
    'auto',
    'ltr',
    'rtl'
  ),
  icons: Joi.array().items(Joi.object().keys({
    src: Joi.string().uri(),
    sizes: Joi.string(),
    type: Joi.string(),
    purpose: Joi.string().valid(
      'any',
      'maskable',
      'badge'
    ),
  })),
  screenshots: Joi.array().items(Joi.object().keys({
    src: Joi.string().uri(),
    sizes: Joi.string(),
    type: Joi.string(),
  })),
}).allow(null);
