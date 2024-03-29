-- Returns distinct UEIs

select
distinct(awardee_or_recipient_uei) as uei
from raw.source_procurement_transaction;
