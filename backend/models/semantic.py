"""
Pydantic models for the Semantic Intelligence Layer.
Collections: brand_system_intelligence, family_relationships, semantic_rules
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

EntityType = Literal[
    "brand_system", "sub_brand", "technology_line", "material_line",
    "implant_line", "product_family", "sku_family", "implant_class",
    "division", "category"
]

SystemType = Literal[
    "plate_system", "nail_system", "screw_system", "stapler_system",
    "mesh_system", "diagnostic_line", "reagent_line", "instrument_line",
    "consumable_line", "stent_system", "valve_system", "joint_system", "unknown"
]

RelationshipType = Literal[
    "belongs_to_system", "associated_with", "compatible_with",
    "uses_instrument_set", "uses_screw_family", "premium_variant_of",
    "coated_variant_of", "stainless_variant_of", "parent_of", "child_of",
    "same_family_as", "same_brochure_group_as", "supersedes", "requires_accessory"
]

RuleType = Literal[
    "classification", "normalization", "relationship_inference",
    "conflict_resolution", "display_naming", "fallback_guardrail"
]

StatusType = Literal["active", "inactive", "draft", "deprecated"]


class EvidenceSource(BaseModel):
    source_file: str
    page: Optional[int] = None
    confidence: float = Field(ge=0.0, le=1.0)


class RelatedEntity(BaseModel):
    entity_code: str
    relationship: str


class BrandSystemIntelligence(BaseModel):
    entity_code: str
    entity_name: str
    entity_type: EntityType = "brand_system"
    parent_brand: Optional[str] = None
    division_canonical: str
    category_bias: list[str] = Field(default_factory=list)
    implant_class_bias: list[str] = Field(default_factory=list)
    system_type: SystemType = "unknown"
    material_default: Optional[str] = None
    material_allowed: list[str] = Field(default_factory=list)
    coating_default: Optional[str] = None
    technology_tags: list[str] = Field(default_factory=list)
    commercial_meaning: str
    clinical_meaning: str
    common_use_cases: list[str] = Field(default_factory=list)
    anatomy_scope: list[str] = Field(default_factory=list)
    known_aliases: list[str] = Field(default_factory=list)
    related_entities: list[RelatedEntity] = Field(default_factory=list)
    evidence_sources: list[EvidenceSource] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool = False
    status: StatusType = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FamilyRelationship(BaseModel):
    relationship_type: RelationshipType
    source_entity_type: EntityType
    source_entity_code: str
    target_entity_type: EntityType
    target_entity_code: str
    relationship_label: str
    direction: Literal["source_to_target", "bidirectional"] = "source_to_target"
    attributes: dict[str, Any] = Field(default_factory=dict)
    evidence_sources: list[EvidenceSource] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    review_required: bool = False
    status: StatusType = "active"


class RuleCondition(BaseModel):
    field: str
    operator: Literal[
        "eq", "eq_ci", "contains", "contains_ci", "regex",
        "in", "not_in", "starts_with", "prefix_match", "exists", "gte", "lte"
    ]
    value: Any = None


class RuleAction(BaseModel):
    set: str
    value: Any


class RuleMatchLogic(BaseModel):
    all: list[RuleCondition] = Field(default_factory=list)
    any: list[RuleCondition] = Field(default_factory=list)
    none: list[RuleCondition] = Field(default_factory=list)


class SemanticRule(BaseModel):
    rule_code: str
    priority: int = 100
    is_active: bool = True
    applies_to: Literal["catalog_product", "catalog_sku", "brand_system", "all"] = "catalog_product"
    rule_type: RuleType
    match_logic: RuleMatchLogic
    actions: list[RuleAction] = Field(default_factory=list)
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
