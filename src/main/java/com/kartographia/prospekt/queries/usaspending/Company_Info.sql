-- Returns names, address, and officers for a given company UEI

select

awardee_or_recipient_uei as uei,
awardee_or_recipient_legal as name,
cage_code,

legal_entity_address_line1 as address,
legal_entity_city_name as city,
legal_entity_state_code as state,
legal_entity_zip5 as zip,

high_comp_officer1_full_na as o1_name,
high_comp_officer1_amount as o1_sal,
high_comp_officer2_full_na as o2_name,
high_comp_officer2_amount as o2_sal,
high_comp_officer3_full_na as o3_name,
high_comp_officer3_amount as o3_sal,
high_comp_officer4_full_na as o4_name,
high_comp_officer4_amount as o4_sal,
high_comp_officer5_full_na as o5_name,
high_comp_officer5_amount as o5_sal,

created_at, updated_at, last_modified,
least(date(created_at), date(updated_at), date(last_modified)) as l

from raw.source_procurement_transaction
where awardee_or_recipient_uei='{uei}' or ultimate_parent_uei='{uei}'

-- Order by most recent updates
order by least(date(created_at), date(updated_at), date(last_modified)) desc;
