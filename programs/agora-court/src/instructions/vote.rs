/*
    1. Verify dispute is in progress then call `close_dispute` to ensure that
       it fails
    2. Check that voter has rep >= `dispute.config.rep_required`
    3. Either update `case.votes` with voter PK or create PDA OR increment 
       `dispute.abstained_votes`
*/