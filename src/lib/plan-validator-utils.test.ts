/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  buildJsonIndex,
  normalizePath,
  getParentPath,
  filterValidationErrors,
  resolveErrorLocation,
  formatFriendlyErrorMessage,
  findTypoSuggestion,
  getCoordinatesDepth
} from './plan-validator-utils';

const EXAMPLE_PLAN_BASE = {
  planKey: '43ec642a-61d7-427d-9aa1-4046ca994b54',
  lifeCycleStatus: 'http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04',
  planDescription: 'Asemakaavahanke...',
  geographicalArea: {
    srid: '3880',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [26478230.97832, 7029409.73545],
          [26478319.31953, 7029563.05089],
          [26478367.60318, 7029567.15694],
          [26478423.13736, 7029571.87958],
          [26478592.47984, 7029586.2805],
          [26478535.52301, 7029392.31324],
          [26478372.27445, 7029401.65226],
          [26478230.97832, 7029409.73545]
        ]
      ]
    }
  },
  planObjects: [
    {
      planObjectKey: '7c093fdb-21e3-4ba7-8a20-aa682ce56666',
      lifeCycleStatus: 'http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04',
      name: {
        fin: 'Asumisen alueen kaavakohde'
      },
      undergroundStatus: 'http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02',
      geometry: {
        srid: '3880',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [26478230.97832, 7029409.73545],
              [26478319.31953, 7029563.05089],
              [26478367.60318, 7029567.15694],
              [26478423.13736, 7029571.87958],
              [26478592.47984, 7029586.2805],
              [26478535.52301, 7029392.31324],
              [26478372.27445, 7029401.65226],
              [26478230.97832, 7029409.73545]
            ]
          ]
        }
      }
    }
  ],
  planRegulationGroups: [
    {
      planRegulationGroupKey: 'b4e8033a-20dc-4eea-90f5-b0f7fa3f985d',
      titleOfPlanRegulation: {
        fin: 'Asumisen alue'
      },
      letterIdentifier: 'AL-1',
      planRegulations: [
        {
          planRegulationKey: 'fece18b9-74d0-4067-a48e-b30577300e42',
          lifeCycleStatus: 'http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04',
          type: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue'
        }
      ]
    }
  ],
  planRegulationGroupRelations: [
    {
      planObjectKey: '7c093fdb-21e3-4ba7-8a20-aa682ce56666',
      planRegulationGroupKey: 'b4e8033a-20dc-4eea-90f5-b0f7fa3f985d'
    }
  ]
};

describe('Plan Validator Utils', () => {
  describe('Path Normalization and Parent Paths', () => {
    it('normalizes various API path formats', () => {
      expect(normalizePath('$.planKea')).toBe('planKea');
      expect(normalizePath('$.geographicalArea.srie')).toBe('geographicalArea.srie');
      expect(normalizePath('plan.planObjects[0].undergroundStatus')).toBe('planObjects[0].undergroundStatus');
      expect(normalizePath('plan.geographicalArea')).toBe('geographicalArea');
      expect(normalizePath('$[0].planObjectKea')).toBe('[0].planObjectKea');
      expect(normalizePath('plan')).toBe('');
      expect(normalizePath('$')).toBe('');
    });

    it('extracts parent paths properly', () => {
      expect(getParentPath('geographicalArea.srie')).toBe('geographicalArea');
      expect(getParentPath('planObjects[0].name.fun')).toBe('planObjects[0].name');
      expect(getParentPath('planObjects[0]')).toBe('planObjects');
      expect(getParentPath('planKey')).toBe('');
    });
  });

  describe('Spelling Suggestions & Geometry Depths', () => {
    it('suggests correct property names for common typos', () => {
      expect(findTypoSuggestion('planKea', 'ValidatePlan')).toBe('planKey');
      expect(findTypoSuggestion('srie', 'RyhtiGeometry')).toBe('srid');
      expect(findTypoSuggestion('planObjectKea', 'PlanObject')).toBe('planObjectKey');
      expect(findTypoSuggestion('Polygin', 'GeometryType')).toBe('Polygon');
      expect(findTypoSuggestion('fun', 'LanguageString')).toBe('fin');
    });

    it('measures coordinate array depths accurately', () => {
      expect(getCoordinatesDepth([26478230, 7029409])).toBe(1); // Point
      expect(getCoordinatesDepth([[26478230, 7029409]])).toBe(2); // LineString / MultiPoint
      expect(getCoordinatesDepth([[[26478230, 7029409]]])).toBe(3); // Polygon
      expect(getCoordinatesDepth([[[[26478230, 7029409]]]])).toBe(4); // MultiPolygon
    });
  });

  describe('Filter Validation Errors', () => {
    it('removes cascade planDto error when specific errors exist', () => {
      const rawErrors = [
        {
          ruleId: 'quality__req_json_unknown_property',
          message: "JSON message contains a field that does not belong to class 'ValidatePlan': 'planKea'",
          instance: '$.planKea'
        },
        {
          ruleId: 'quality__req_json_deserialization_failure',
          message: "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
          instance: 'planDto'
        }
      ];

      const filtered = filterValidationErrors(rawErrors);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].instance).toBe('$.planKea');
    });

    it('keeps planDto if it is the only error (e.g. empty body)', () => {
      const rawErrors = [
        {
          ruleId: 'quality__req_json_deserialization_failure',
          message: "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
          instance: 'planDto'
        }
      ];

      const filtered = filterValidationErrors(rawErrors);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].instance).toBe('planDto');
    });
  });

  describe('RAG 10 Examples Verification', () => {
    // Example 2: misspelled property "planKea" at root level
    it('Example 2: pinpoints planKea on root level', () => {
      const json = JSON.stringify(
        {
          planKea: '43ec642a-61d7-427d-9aa1-4046ca994b54',
          lifeCycleStatus: 'http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04'
        },
        null,
        2
      );

      const index = buildJsonIndex(json);
      const err = {
        ruleId: 'quality__req_json_unknown_property',
        message: "JSON message contains a field that does not belong to class 'ValidatePlan': 'planKea'",
        instance: '$.planKea'
      };

      const loc = resolveErrorLocation(err, index);
      expect(loc.lineNum).toBe(2);
      expect(loc.field).toBe('planKea');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('planKea');
      expect(friendly.suggestion).toContain('planKey');
    });

    // Example 3: Wrong property type for planKey (array instead of string)
    it('Example 3: pinpoints planKey when array given instead of string', () => {
      const json = JSON.stringify(
        {
          planKey: ['43ec642a-61d7-427d-9aa1-4046ca994b54']
        },
        null,
        2
      );

      const index = buildJsonIndex(json);
      const err = {
        ruleId: 'quality__req_json_deserialization_failure',
        message:
          'Invalid JSON message. Raw error: The JSON value could not be converted to Application.PlanEntities.DTOs.PublicValidation.ValidatePlanDto. Path: $.planKey | LineNumber: 0 | BytePositionInLine: 12.',
        instance: '$.planKey'
      };

      const loc = resolveErrorLocation(err, index);
      expect(loc.lineNum).toBe(2);

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('planKey');
      expect(friendly.friendlyMessage).toContain('tietotyyppiä');
    });

    // Example 4: Misspelled property name "srie" at hierarchy level 1
    it('Example 4: pinpoints srie inside geographicalArea', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        geographicalArea: {
          srie: '3880',
          geometry: EXAMPLE_PLAN_BASE.geographicalArea.geometry
        }
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_json_unknown_property',
        message: "JSON message contains a field that does not belong to class 'RyhtiGeometry': 'srie'",
        instance: '$.geographicalArea.srie'
      };

      const loc = resolveErrorLocation(err, index);
      expect(loc.field).toBe('geographicalArea.srie');
      expect(json.split('\n')[loc.lineNum - 1]).toContain('"srie"');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('srie');
      expect(friendly.suggestion).toContain('srid');
    });

    // Example 5: Geometry coordinates do not match with geometry type (Polygon with MultiPolygon coordinates)
    it('Example 5: pinpoints geometry type coordinates mismatch', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        geographicalArea: {
          srid: '3880',
          geometry: {
            type: 'Polygon',
            // MultiPolygon 4-level coordinates
            coordinates: [
              [
                [
                  [26478230.97832, 7029409.73545],
                  [26478319.31953, 7029563.05089]
                ]
              ]
            ]
          }
        }
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_geom_type_coordinates_mismatch',
        message: 'Geometry coordinates do not correspond to the geometry type.',
        instance: 'Type'
      };

      const loc = resolveErrorLocation(err, index);
      expect(loc.field).toBe('geographicalArea.geometry.type');
      expect(json.split('\n')[loc.lineNum - 1]).toContain('"type": "Polygon"');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('ei vastaa');
    });

    // Example 6: Invalid geometry type ("Polygin")
    it('Example 6: pinpoints invalid geometry type Polygin', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        geographicalArea: {
          srid: '3880',
          geometry: {
            type: 'Polygin',
            coordinates: EXAMPLE_PLAN_BASE.geographicalArea.geometry.coordinates
          }
        }
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_json_deserialization_failure',
        message: "Invalid JSON message. Raw error: Provided 'Type' value Polygin was not valid GeometryType value",
        instance: '$.geographicalArea.geometry'
      };

      const loc = resolveErrorLocation(err, index);
      expect(json.split('\n')[loc.lineNum - 1]).toContain('Polygin');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('Polygin');
      expect(friendly.suggestion).toContain('Polygon');
    });

    // Example 7: Misspelled property name "planObjectKea" in planObjects[0]
    it('Example 7: pinpoints planObjectKea in planObjects[0] from $[0] path', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        planObjects: [
          {
            planObjectKea: '7c093fdb-21e3-4ba7-8a20-aa682ce56666'
          }
        ]
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_json_unknown_property',
        message: "JSON message contains a field that does not belong to class 'PlanObject': 'planObjectKea'",
        instance: '$[0].planObjectKea'
      };

      const loc = resolveErrorLocation(err, index);
      expect(json.split('\n')[loc.lineNum - 1]).toContain('planObjectKea');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('planObjectKea');
      expect(friendly.suggestion).toContain('planObjectKey');
    });

    // Example 8: Unknown property "fun" in planObjects[0].name.fun
    it('Example 8: pinpoints fun in LanguageString from $[0].name.fun path', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        planObjects: [
          {
            planObjectKey: '7c093fdb-21e3-4ba7-8a20-aa682ce56666',
            name: {
              fin: 'Asumisen alue',
              fun: 'jee'
            }
          }
        ]
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_json_unknown_property',
        message: "JSON message contains a field that does not belong to class 'LanguageString': 'fun'",
        instance: '$[0].name.fun'
      };

      const loc = resolveErrorLocation(err, index);
      expect(json.split('\n')[loc.lineNum - 1]).toContain('fun');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('fun');
      expect(friendly.suggestion).toContain('fin');
    });

    // Example 9: Wrong codelist code value with classKey
    it('Example 9: pinpoints undergroundStatus using classKey and instance path', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        planObjects: [
          {
            ...EXAMPLE_PLAN_BASE.planObjects[0],
            undergroundStatus: 'http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02_a'
          }
        ]
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_codelist_property_codevalue_not_allowed',
        message:
          'Code value in the PlanObject class’s undergroundStatus attribute is not valid. Must belong to the code list http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji.',
        instance: 'plan.planObjects[0].undergroundStatus',
        classKey: '7c093fdb-21e3-4ba7-8a20-aa682ce56666'
      };

      const loc = resolveErrorLocation(err, index);
      expect(json.split('\n')[loc.lineNum - 1]).toContain('undergroundStatus');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('undergroundStatus');
      expect(friendly.suggestion).toContain('RY_MaanalaisuudenLaji');
    });

    // Example 10: Wrong admin area with classKey
    it('Example 10: pinpoints geographicalArea when admin area does not match', () => {
      const json = JSON.stringify(EXAMPLE_PLAN_BASE, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_geom_location_administrativearea',
        message:
          'The area-like geometry of the geographical area attribute must be situated within a geographical area corresponding to the value of the administrativeAreaIdentifier attribute and administrativeAreaIdentifier must be valid.',
        instance: 'plan.geographicalArea',
        classKey: '43ec642a-61d7-427d-9aa1-4046ca994b54'
      };

      const loc = resolveErrorLocation(err, index);
      expect(loc.field).toBe('geographicalArea');
      expect(json.split('\n')[loc.lineNum - 1]).toContain('"geographicalArea"');

      const friendly = formatFriendlyErrorMessage(err, loc.field);
      expect(friendly.friendlyMessage).toContain('aluerajaus');
    });

    // Example 11: Geometry coordinates do not match with Point type
    it('Example 11: pinpoints and explains a Point coordinates mismatch correctly', () => {
      const doc = {
        ...EXAMPLE_PLAN_BASE,
        planObjects: [
          {
            planObjectKey: '7c093fdb-21e3-4ba7-8a20-aa682ce56666',
            geometry: {
              type: 'Point',
              // Depth 2 coordinates (LineString/MultiPoint style) instead of Point depth 1 [x,y]
              coordinates: [
                [26478230.97832, 7029409.73545],
                [26478319.31953, 7029563.05089]
              ]
            }
          }
        ]
      };
      const json = JSON.stringify(doc, null, 2);
      const index = buildJsonIndex(json);

      const err = {
        ruleId: 'quality__req_geom_type_coordinates_mismatch',
        message: 'Geometry coordinates do not correspond to the geometry type.',
        instance: 'plan.planObjects[0].geometry.type'
      };

      const loc = resolveErrorLocation(err, index, doc);
      expect(loc.field).toBe('planObjects[0].geometry.type');

      const friendly = formatFriendlyErrorMessage(err, loc.field, index, doc);
      expect(friendly.friendlyMessage).toContain('Point');
      expect(friendly.explanation).toContain('LineString tai MultiPoint');
      expect(friendly.suggestion).toContain('hakasulkeet');
    });

    // Example 12: Invalid codelist value deserialization failure recognition
    it('Example 12: recognises codelist value errors and distinguishes them from generic deserialization failures', () => {
      const err = {
        ruleId: 'quality__req_json_deserialization_failure',
        message: "Invalid JSON message. Raw error: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus2' is not valid value for EPlanRegulationAdditionalInfoType",
        instance: '$.planRegulationGroups[0].planRegulations[0].additionalInformations[0].type'
      };

      const friendly = formatFriendlyErrorMessage(err, 'planRegulationGroups[0].planRegulations[0].additionalInformations[0].type');
      expect(friendly.friendlyMessage).toContain('paakayttotarkoitus2');
      expect(friendly.friendlyMessage).toContain('type');
      expect(friendly.explanation).toContain('paakayttotarkoitus2');
      expect(friendly.explanation).toContain('PlanRegulationAdditionalInfoType');
      expect(friendly.explanation).toContain('RY_Kaavamaarayksen_Lisatiedonlaji');
      expect(friendly.suggestion).toContain('RY_Kaavamaarayksen_Lisatiedonlaji');
    });
  });
});
