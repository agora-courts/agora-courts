/* initialize_reputation.rs + close_dispute.rs 
    - user already voted - throw
    - user unclaimed disputes - throw
    - user max disputes reached - throw
    - user does not have enough reputation - throw
    - dispute not votable - throw
    - valid vote - increment reputation.claim_queue.len() and case.votes, 
        set new dispute.leader if necessary
*/