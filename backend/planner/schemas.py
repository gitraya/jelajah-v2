"""Pydantic models for the planner's structured output (Claude `output_format`,
Gemini `response_json_schema`).

Kept deliberately simple (no min/max, no regex): structured outputs do not
support every JSON-schema keyword. Values are cleaned after parsing in
planner.services.clean_draft.
"""
from typing import List, Literal

from pydantic import BaseModel


class Stop(BaseModel):
    time: str
    name: str
    type: str
    description: str
    address: str
    estimated_time: str
    cost: int
    booking_url: str


class Day(BaseModel):
    day: int
    title: str
    date: str
    stops: List[Stop]


class Draft(BaseModel):
    title: str
    destination: str
    country_flag: str
    description: str
    start_date: str
    end_date: str
    travelers: int
    difficulty: Literal["EASY", "MODERATE", "CHALLENGING"]
    days: List[Day]


class PlannerResponse(BaseModel):
    reply: str
    draft: Draft
