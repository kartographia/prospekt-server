-- Returns

select

awardee_or_recipient_uei as uei, --company id


-- Award ID --
piid,
unique_award_key,


-- Description --
award_description,
product_or_service_co_desc,
naics_description,
commercial_item_acqui_desc,


-- Solicitation Info --
solicitation_identifier,
solicitation_date,
extent_competed, -- Code for things like competed vs not competed
number_of_offers_received,
type_set_aside,


-- Type of Contract --
contract_award_type, -- Code
type_of_contract_pricing, -- Code for things like FFP, T&M, etc
idv_type_description, --Code for thing like BPA, FSS


-- Type of Service --
naics,


-- Customer --
funding_agency_name as customer,
funding_office_name as office,


-- Award Value --
current_total_value_award as awarded_value, -- awarded amount (varies within the project)
federal_action_obligation as funded_value, -- funded amount (varies within the project)
potential_total_value_awar as extended_value, -- potential amount (varies within the project)


-- Period of Performance --
period_of_performance_star as start_date,
period_of_performance_curr as end_date,
period_of_perf_potential_e as extended_date,


-- Place of Performance --
place_of_perf_country_desc as country, -- Full country name
place_of_performance_state as state, -- 2 char abbreviation
place_of_perform_city_name as city,
place_of_perform_county_co as county, -- 3 digit
place_of_performance_zip5 as zip, --5 digit


-- Action Info --
action_date,
action_type


from raw.source_procurement_transaction

where awardee_or_recipient_uei='{uei}' or ultimate_parent_uei='{uei}'

-- Ensure that the latest transactions appear first
order by piid, least(date(created_at), date(updated_at), date(last_modified)) desc;