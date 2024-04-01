select

piid,
unique_award_key,
awardee_or_recipient_uei as uei, --company id


action_date,
action_type,
federal_action_obligation,
award_modification_amendme,







solicitation_identifier,
solicitation_date,

type_of_contract_pricing, --Codes for things like FFP, T&M, etc
extent_competed, --Codes for things like not competed














solicitation_identifier
solicitation_date
extent_competed

piid
unique_award_key



from raw.source_procurement_transaction

where piid='{award}' or unique_award_key='{award}'

order by piid, action_date;