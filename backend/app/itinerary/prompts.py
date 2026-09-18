"""
The itinerary-generation prompt lives here, isolated from orchestration code
(app/itinerary/service.py), so it can be tuned without touching request handling,
the LLM provider abstraction, or persistence logic.
"""


def build_itinerary_prompt(
    trip: dict,
    preferences: list[dict],
    members_by_id: dict[str, dict],
    date_list: list[str],
) -> str:
    lines: list[str] = []

    lines.append(
        f"You are an expert travel planner. Plan a {len(date_list)}-day group trip to "
        f"{trip['destination']}."
    )
    lines.append(f"Trip dates: {trip['start_date']} to {trip['end_date']}.")
    lines.append(
        f"Group budget for the whole trip, per person: {trip['budget_min']}-{trip['budget_max']}."
    )
    lines.append("")

    if preferences:
        lines.append(f"{len(preferences)} member(s) shared their preferences:")
        for pref in preferences:
            member = members_by_id.get(pref["user_id"])
            name = member["name"] if member else "A member"
            must_see = pref["must_see"] or "none specified"
            lines.append(
                f"- {name}: interested in {', '.join(pref['interests'])}; "
                f"budget comfort: {pref['budget_comfort']}; "
                f"date flexibility: {pref['date_flexibility']}; "
                f"must-see: {must_see}"
            )
    else:
        lines.append("No members have submitted preferences yet — plan a broadly appealing trip.")

    missing = len(members_by_id) - len(preferences)
    if preferences and missing > 0:
        lines.append(
            f"({missing} more member(s) haven't submitted preferences yet — keep the plan "
            "flexible enough to still suit them.)"
        )
    lines.append("")

    lines.append(
        f"Plan exactly these {len(date_list)} day(s), in this order, using these exact dates: "
        f"{', '.join(date_list)}."
    )
    lines.append(
        "For each day, propose 3-5 realistic, well-paced activities with specific time slots, "
        "a short one-sentence description, and a category. Avoid over-packing the schedule — "
        "leave room for meals and travel time between activities."
    )
    lines.append(
        "When an activity is a real, findable place (restaurant, attraction, landmark, beach, "
        "market), fill 'place_query' with a specific, map-searchable name (e.g. 'Baga Beach Goa' "
        "or 'a seafood restaurant in Calangute'). For non-place items (airport transfer, hotel "
        "check-in/out, free time), leave 'place_query' empty."
    )
    lines.append(
        "If members' stated preferences genuinely conflict (e.g. one wants late nightlife while "
        "another wants early mornings; very different budget comfort levels; incompatible "
        "must-see requests on the same day), do not silently pick a side. Instead add an entry "
        "to 'conflicts' naming the members involved and a short, neutral note for the group to "
        "discuss and resolve themselves. Only raise genuine conflicts — don't invent one if "
        "preferences are compatible."
    )
    lines.append("Respond with JSON only, matching the provided schema exactly.")

    return "\n".join(lines)


def build_day_regeneration_prompt(
    trip: dict,
    preferences: list[dict],
    members_by_id: dict[str, dict],
    day_number: int,
    current_day: dict,
    instruction: str,
) -> str:
    lines: list[str] = []

    lines.append(f"You are revising ONE day of an existing group trip itinerary to {trip['destination']}.")
    lines.append(f"Trip dates: {trip['start_date']} to {trip['end_date']}.")
    lines.append(f"Group budget for the whole trip, per person: {trip['budget_min']}-{trip['budget_max']}.")
    lines.append("")

    if preferences:
        lines.append("Group preferences (unchanged from the original plan):")
        for pref in preferences:
            member = members_by_id.get(pref["user_id"])
            name = member["name"] if member else "A member"
            lines.append(
                f"- {name}: interested in {', '.join(pref['interests'])}; "
                f"budget comfort: {pref['budget_comfort']}; date flexibility: {pref['date_flexibility']}"
            )
        lines.append("")

    lines.append(f"Current plan for Day {day_number} ({current_day['date']}):")
    lines.append(f"Summary: {current_day['summary']}")
    for act in current_day["activities"]:
        lines.append(f"- {act['time']} {act['title']} ({act['category']}): {act['description']}")
    lines.append("")

    lines.append(f'A group member requested this change: "{instruction}"')
    lines.append(
        "Produce a REVISED plan for this single day only, applying the requested change while keeping "
        "the rest of the day sensible and well-paced. Keep the same date and day_number. Follow the same "
        "guidelines as before: realistic time slots, a short one-sentence description per activity, a "
        "category, and 'place_query' filled for real, findable places (empty for logistics like transfers "
        "or check-in/out)."
    )
    lines.append("Respond with JSON only, matching the provided schema exactly.")

    return "\n".join(lines)
