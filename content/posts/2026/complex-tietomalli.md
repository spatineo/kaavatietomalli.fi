---
title: Monimutkainen tietomalli - Kansallinen suunnittelujärjestelmä
excerpt: Syväsukellus laajaan ja monimutkaiseen kaupunkisuunnittelun tietomalliin, joka yhdistää viranomaiset, kiinteistöt ja ympäristörajoitteet.
date: 2026-05-06
author: Ilkka Rinne
authorSlug: ilkka-rinne
category: journal
tags:
  - tietomallit
  - UML
  - arkkitehtuuri
coverImage: https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&q=80&w=2000
---

Nykyaikainen kaupunkisuunnittelu vaatii äärimmäisen tarkkoja ja monitasoisia tietomalleja. Tässä esimerkissä tarkastelemme visualisoituna, miltä näyttää kansallisen tason kaavoitusjärjestelmän ydinrakenne, kun siihen integroidaan niin kiinteistötiedot, ympäristörajoitteet kuin viranomaisprosessitkin.

Alla oleva kaavio havainnollistaa järjestelmän monimutkaisuutta. Voit klikata kaaviota avataksesi sen koko ruudun näkymään, jossa voit tarkastella yksittäisiä luokkia ja niiden suhteita tarkemmin.

```mermaid
classDiagram
    direction TB
    class Organization {
        +String id
        +String name
        +String sector
        +Address contactInfo
        +OrganizationType type
        +registerMember(User user)
    }

    class User {
        +String uid
        +String email
        +String displayName
        +Role role
        +DateTime lastLogin
        +updateProfile()
    }

    class Project {
        +String projectId
        +String title
        +ProjectStatus status
        +DateTime startDate
        +DateTime deadline
        +Budget budget
        +calculateProgress()
    }

    class Plan {
        +String planId
        +PlanType type
        +Polygon geometry
        +DateTime approvalDate
        +validateGeometricIntegrity()
    }

    class Zone {
        +String zoneId
        +String colorCode
        +Float maxEfficiency
        +Int maxFloors
        +ZoneClass category
    }

    class Regulation {
        +String regId
        +String textContent
        +Integer priority
        +Boolean isBinding
    }

    class Building {
        +String buildingId
        +Float height
        +Float volume
        +UsageType usage
        +ConstructionYear year
    }

    class Parcel {
        +String parcelId
        +Float area
        +String ownerName
        +LandUseCategory category
    }

    class Infrastructure {
        +String infraId
        +InfraType type
        +MaintenanceCycle cycle
        +AssetValue value
    }

    class EnvironmentalConstraint {
        +String constraintId
        +SeverityLevel severity
        +ConservationType type
        +Polygon affectedArea
    }

    class Document {
        +String docId
        +String fileName
        +String mimeType
        +Long fileSize
        +getDownloadUrl()
    }

    class Comment {
        +String commentId
        +String message
        +DateTime timestamp
        +Boolean isPublic
    }

    class ApprovalProcess {
        +String processId
        +Decision finalDecision
        +DateTime completionDate
    }

    class WorkflowStep {
        +String stepId
        +Int sequence
        +StepStatus status
        +Duration estimatedTime
    }

    class Stakeholder {
        +String sId
        +StakeholderType category
        +ImpactLevel impact
    }

    class GeoSpatialLayer {
        +String layerId
        +Projection srs
        +Float opacity
        +Boolean isVisible
    }

    class Metadata {
        +String metaId
        +String source
        +LicenseType license
        +DateTime lastHarvested
    }

    class Version {
        +String versionId
        +Int major
        +Int minor
        +String changeLog
    }

    class Notification {
        +String notificationId
        +Priority priority
        +Boolean isRead
        +sendToUser(User user)
    }

    class ApiIntegrator {
        +String apiKey
        +String endpoint
        +ProtocolType protocol
        +QuotaLimit rateLimit
    }

    class SchemaDefinition {
        +String schemaId
        +String namespace
        +VersionSpec version
    }

    class ValidationRule {
        +String ruleId
        +String expression
        +Severity level
    }

    class EconomicImpact {
        +String impactId
        +Currency value
        +Float multiplier
        +AnalysisMethod method
    }

    class DemographicData {
        +String dataId
        +Int population
        +Int householdSize
        +AgeDistribution stats
    }

    class TransportationNetwork {
        +String networkId
        +NetworkType mode
        +Capacity maxLoad
        +Line segment
    }

    Organization "1" --* "many" User : employs
    Organization "1" --o "many" Project : manages
    Project "1" *-- "many" Plan : contains
    Plan "1" *-- "many" Zone : defines
    Zone "1" --o "many" Regulation : applies_to
    Plan "1" -- "many" Parcel : covers
    Parcel "1" -- "many" Building : contains
    Building "1" -- "many" Infrastructure : depends_on
    Plan "1" -- "many" EnvironmentalConstraint : respects
    Project "1" -- "many" Document : references
    Document "1" -- "many" Comment : has
    Project "1" -- "1" ApprovalProcess : requires
    ApprovalProcess "1" *-- "many" WorkflowStep : consists_of
    Project "1" -- "many" Stakeholder : involves
    Plan "1" -- "many" GeoSpatialLayer : displayed_on
    GeoSpatialLayer "1" -- "1" Metadata : described_by
    Plan "1" -- "many" Version : historical_records
    User "1" -- "many" Notification : receives
    Organization "1" -- "many" ApiIntegrator : provides
    Page "1" -- "1" SchemaDefinition : follows
    SchemaDefinition "1" *-- "many" ValidationRule : uses
    Plan "1" -- "1" EconomicImpact : analyzed_for
    Zone "1" -- "1" DemographicData : based_on_demand
    Plan "1" -- "1" TransportationNetwork : connects_to
    Infrastructure --|> TransportationNetwork : inherits
```

Tämä arkkitehtuuri mahdollistaa saumattoman tiedonkulun eri sidosryhmien välillä, varmistaen että jokainen päätös perustuu ajantasaiseen ja vahvasti tyypitettyyn dataan.
