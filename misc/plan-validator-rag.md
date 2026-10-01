# Plan validator error report interpretation training data

This file contains pairs of input JSON documents including different input errors and corresponding validation software produced JSON error reports for those errors. This data is intended to be used as a RAG system for correctly transforming the error report JSON into a human-understandable error message and the structural JSON path pointing to the JSON object containing the error.

## Example 1: No errors
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 200):
```json
```

## Example 2: misspelled property ("planKea" should be "planKey") at the root level
Input:
```json
{
  "planKea": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_unknown_property",
      "message": "JSON message contains a field that does not belong to class 'ValidatePlan': 'planKea'",
      "localizedMessage": {
        "fi": "JSON-sanoma sisältää luokkaan 'ValidatePlan' kuulumattoman kentän: 'planKea'",
        "sv": "JSON-meddelandet innehåller ett fält som inte hör till klassen 'ValidatePlan': 'planKea'",
        "en": "JSON message contains a field that does not belong to class 'ValidatePlan': 'planKea'"
      },
      "instance": "$.planKea"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-8e01b207f1ee17dd486a0ece98659c78-af7d980decf53d0f-00"
}
```

## Example 3: Wrong property type for the property "planKey" at the root level (array, not string)
Input:
```json
{
  "planKey": ["43ec642a-61d7-427d-9aa1-4046ca994b54"],
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: The JSON value could not be converted to Application.PlanEntities.DTOs.PublicValidation.ValidatePlanDto. Path: $.planKey | LineNumber: 0 | BytePositionInLine: 12.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: The JSON value could not be converted to Application.PlanEntities.DTOs.PublicValidation.ValidatePlanDto. Path: $.planKey | LineNumber: 0 | BytePositionInLine: 12.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: The JSON value could not be converted to Application.PlanEntities.DTOs.PublicValidation.ValidatePlanDto. Path: $.planKey | LineNumber: 0 | BytePositionInLine: 12.",
        "en": "Invalid JSON message. Raw error: The JSON value could not be converted to Application.PlanEntities.DTOs.PublicValidation.ValidatePlanDto. Path: $.planKey | LineNumber: 0 | BytePositionInLine: 12."
      },
      "instance": "$.planKey"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-2f2f1f88d9506bd2979db4d2fc618101-e5ca0e4ae1e3583d-00"
}
```

## Example 4: A missplelled property name ("srie" instead of "srid") at the hierarchy level 1
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srie": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_unknown_property",
      "message": "JSON message contains a field that does not belong to class 'RyhtiGeometry': 'srie'",
      "localizedMessage": {
        "fi": "JSON-sanoma sisältää luokkaan 'RyhtiGeometry' kuulumattoman kentän: 'srie'",
        "sv": "JSON-meddelandet innehåller ett fält som inte hör till klassen 'RyhtiGeometry': 'srie'",
        "en": "JSON message contains a field that does not belong to class 'RyhtiGeometry': 'srie'"
      },
      "instance": "$.geographicalArea.srie"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-93a0402b5c3e8d4d0708c7320ae94178-d0dd0ba303e3725d-00"
}
```

## Example 5: Polygon geometry type indicated, but multipolygon provided (wrong type, but structurally valid geometry)
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            [
              26478230.97832,
              7029409.73545
            ],
            [
              26478319.31953,
              7029563.05089
            ],
            [
              26478367.60318,
              7029567.15694
            ],
            [
              26478423.13736,
              7029571.87958
            ],
            [
              26478592.47984,
              7029586.2805
            ],
            [
              26478535.52301,
              7029392.31324
            ],
            [
              26478372.27445,
              7029401.65226
            ],
            [
              26478230.97832,
              7029409.73545
            ]
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 422):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
  "title": "One or more validation errors occurred.",
  "status": 422,
  "detail": "Validation failed: \r\n -- Type: Geometry coordinates do not match with geometry type. Severity: Error",
  "errors": [
    {
      "ruleId": "quality__req_geom_type_coordinates_mismatch",
      "message": "Geometry coordinates do not correspond to the geometry type.",
      "localizedMessage": {
        "fi": "Geometrian koordinaatit eivät vastaa geometrian tyyppiä.",
        "sv": "Geometrins koordinater motsvarar inte typen av geometri.",
        "en": "Geometry coordinates do not correspond to the geometry type."
      },
      "instance": "Type"
    }
  ],
  "warnings": [],
  "traceId": "00-7c095e617e8cca140fc94fe1abfc5ec1-5884c42d268f4828-00"
}
```

## Example 6: Error in geometry data structure: invalid geometry type ("Polygin")
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygin",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: Provided 'Type' value Polygin was not valid GeometryType value",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: Provided 'Type' value Polygin was not valid GeometryType value",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: Provided 'Type' value Polygin was not valid GeometryType value",
        "en": "Invalid JSON message. Raw error: Provided 'Type' value Polygin was not valid GeometryType value"
      },
      "instance": "$.geographicalArea.geometry"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-863eda85af112f18a8dbafcc9e0096a9-50ca3781e66d6a22-00"
}
```

## Example 7: Misspelled property name "planObjectKea" in the first object of an array-valued property "planObjects"
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKea": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_unknown_property",
      "message": "JSON message contains a field that does not belong to class 'PlanObject': 'planObjectKea'",
      "localizedMessage": {
        "fi": "JSON-sanoma sisältää luokkaan 'PlanObject' kuulumattoman kentän: 'planObjectKea'",
        "sv": "JSON-meddelandet innehåller ett fält som inte hör till klassen 'PlanObject': 'planObjectKea'",
        "en": "JSON message contains a field that does not belong to class 'PlanObject': 'planObjectKea'"
      },
      "instance": "$[0].planObjectKea"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-21033b3d73a86a801a4061a3c6f34f6e-00a8547ea2e922c7-00"
}
```

## Example 8: Unknown property "fun" at the hierarchy level 2 (planObjects[0].name.fun)
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde",
        "fun": "jee"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 400):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
  "title": "Error deserializing JSON request body",
  "status": 400,
  "detail": "Error while deserializing JSON request body - check the request body matches the expected JSON schema for the endpoint",
  "errors": [
    {
      "ruleId": "quality__req_json_unknown_property",
      "message": "JSON message contains a field that does not belong to class 'LanguageString': 'fun'",
      "localizedMessage": {
        "fi": "JSON-sanoma sisältää luokkaan 'LanguageString' kuulumattoman kentän: 'fun'",
        "sv": "JSON-meddelandet innehåller ett fält som inte hör till klassen 'LanguageString': 'fun'",
        "en": "JSON message contains a field that does not belong to class 'LanguageString': 'fun'"
      },
      "instance": "$[0].name.fun"
    },
    {
      "ruleId": "quality__req_json_deserialization_failure",
      "message": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided.",
      "localizedMessage": {
        "fi": "JSON-sanoma virheellinen. Raakavirhe: A value for the 'planDto' parameter or property was not provided.",
        "sv": "JSON-meddelandet är felaktigt. Grovt fel: A value for the 'planDto' parameter or property was not provided.",
        "en": "Invalid JSON message. Raw error: A value for the 'planDto' parameter or property was not provided."
      },
      "instance": "planDto"
    }
  ],
  "warnings": [],
  "traceId": "00-5fc60b6b6330ffa4d3777bab18678384-bb177aff5810fc23-00"
}
```

## Example 9: Wrong codelist code value for property "undergroundStatus": given "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02_a" when should have been "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02"
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02_a",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 422):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
  "title": "One or more validation errors occurred.",
  "status": 422,
  "detail": "Validation failed: \r\n -- plan.planObjects[0].undergroundStatus: plan.planObjects[0].undergroundStatus Severity: Error",
  "errors": [
    {
      "ruleId": "quality__req_codelist_property_codevalue_not_allowed",
      "message": "Code value in the PlanObject class’s undergroundStatus attribute is not valid. Must belong to the code list http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji.",
      "localizedMessage": {
        "fi": "Koodiarvo ei ole kelvollinen PlanObject-luokan undergroundStatus-attribuutilla. Tulee kuulua koodistoon http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji.",
        "sv": "Kodvärdet är inte giltigt med attributet undergroundStatus i klassen PlanObject. Ska tillhöra kodsystemet http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji.",
        "en": "Code value in the PlanObject class’s undergroundStatus attribute is not valid. Must belong to the code list http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji."
      },
      "instance": "plan.planObjects[0].undergroundStatus",
      "classKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666"
    }
  ],
  "warnings": [],
  "traceId": "00-0c7b5f158a6f468a555cb909bedaf027-5a3313c7d64f4216-00"
}
```

## Example 10: Wrong admin area (does not match the given geometries)
Input:
```json
{
  "planKey": "43ec642a-61d7-427d-9aa1-4046ca994b54",
  "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
  "planDescription": "Asemakaavahanke pohjautuu kunnan ja maanomistajien aloitteeseen.\n\nKunnan tavoitteena on edistää alueen elinkeinotoimintaa sekä muodostaa alueelle laadukasta ja hyvää ympäristöä.",
  "geographicalArea": {
    "srid": "3880",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [
            26478230.97832,
            7029409.73545
          ],
          [
            26478319.31953,
            7029563.05089
          ],
          [
            26478367.60318,
            7029567.15694
          ],
          [
            26478423.13736,
            7029571.87958
          ],
          [
            26478592.47984,
            7029586.2805
          ],
          [
            26478535.52301,
            7029392.31324
          ],
          [
            26478372.27445,
            7029401.65226
          ],
          [
            26478230.97832,
            7029409.73545
          ]
        ]
      ]
    }
  },
  "planObjects": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
      "name": {
        "fin": "Asumisen alueen kaavakohde"
      },
      "undergroundStatus": "http://uri.suomi.fi/codelist/rytj/RY_MaanalaisuudenLaji/code/02",
      "geometry": {
        "srid": "3880",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                26478230.97832,
                7029409.73545
              ],
              [
                26478319.31953,
                7029563.05089
              ],
              [
                26478367.60318,
                7029567.15694
              ],
              [
                26478423.13736,
                7029571.87958
              ],
              [
                26478592.47984,
                7029586.2805
              ],
              [
                26478535.52301,
                7029392.31324
              ],
              [
                26478372.27445,
                7029401.65226
              ],
              [
                26478230.97832,
                7029409.73545
              ]
            ]
          ]
        }
      }
    }
  ],
  "planRegulationGroups": [
    {
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d",
      "titleOfPlanRegulation": {
        "fin": "Asumisen, liike- ja toimistorakennusten alue, jolle saa sijoittaa myös palveluja ja palveluasumista"
      },
      "letterIdentifier": "AL-1",
      "planRegulations": [
        {
          "planRegulationKey": "fece18b9-74d0-4067-a48e-b30577300e42",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/asumisenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "28c5f77a-14f2-4788-8e35-a31864e98d7d",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/liikerakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "e0d909a3-6bb2-4a38-83f3-968c5cae5a94",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/toimistorakennustenAlue",
          "additionalInformations": [
            {
              "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayksen_Lisatiedonlaji/code/paakayttotarkoitus"
            }
          ]
        },
        {
          "planRegulationKey": "6fa3e528-2dc6-42d4-a7a6-bb982d73455c",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/palvelujenAlue"
        },
        {
          "planRegulationKey": "9ef41cbd-c4b9-435e-883f-aaf23ae7256f",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/matkailupalvelujenAlue"
        },
        {
          "planRegulationKey": "ee060c5b-149b-4ae3-aa6f-2d42ba2d2817",
          "lifeCycleStatus": "http://uri.suomi.fi/codelist/rytj/kaavaelinkaari/code/04",
          "type": "http://uri.suomi.fi/codelist/rytj/RY_Kaavamaarayslaji/code/sanallinenMaarays",
          "value": {
            "dataType": "LocalizedText",
            "text": {
              "fin": "Alueelle saa sjioittaa myös ravintola- ja palveluasumisen tiloja"
            }
          },
          "verbalRegulations": [
            "http://uri.suomi.fi/codelist/rytj/RY_Sanallisen_Kaavamaarayksen_Laji/code/tontinKaytto"
          ]
        }
      ]
    }
  ],
  "planRegulationGroupRelations": [
    {
      "planObjectKey": "7c093fdb-21e3-4ba7-8a20-aa682ce56666",
      "planRegulationGroupKey": "b4e8033a-20dc-4eea-90f5-b0f7fa3f985d"
    }
  ]
}
```

Validator response (status code 422):
```json
{
  "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422",
  "title": "One or more validation errors occurred.",
  "status": 422,
  "detail": "Validation failed: \r\n -- plan.geographicalArea: The specified condition was not met for 'geographicalArea'. Severity: Error",
  "errors": [
    {
      "ruleId": "quality__req_geom_location_administrativearea",
      "message": "The area-like geometry of the geographical area attribute must be situated within a geographical area corresponding to the value of the administrativeAreaIdentifier attribute and administrativeAreaIdentifier must be valid.",
      "localizedMessage": {
        "fi": "Aluerajaus-attribuutin aluemainen geometria tulee sijaita hallinnollisenAlueenTunnus-attribuutin arvoa vastaavan aluerajauksien sisällä ja hallinnollisenAlueenTunnuksen tulee olla voimassa.",
        "sv": "Områdesavgränsning-attributs områdeslika geometri ska vara inom administrativOmrådesBeteckning-attributet och motsvara värdet inom områdesavgränsningen och den administrativaOmrådesBeteckningen ska vara i kraft.",
        "en": "The area-like geometry of the geographical area attribute must be situated within a geographical area corresponding to the value of the administrativeAreaIdentifier attribute and administrativeAreaIdentifier must be valid."
      },
      "instance": "plan.geographicalArea",
      "classKey": "43ec642a-61d7-427d-9aa1-4046ca994b54"
    }
  ],
  "warnings": [],
  "traceId": "00-3083e74e0a2dac78ef503c23db681952-bde3524bcd545b2a-00"
}
```

