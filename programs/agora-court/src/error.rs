use anchor_lang::error_code;

#[error_code]
pub enum InputError {
    #[msg("Invalid court authority")]
    InvalidCourtAuthority,
    #[msg("Dispute does not contain payer")]
    DisputeDoesNotContainPayer,
    #[msg("User does not have a case in this dispute")]
    UserDoesNotHaveCase,
    #[msg("Dispute is not currently votable")]
    DisputeNotVotable,
    #[msg("Dispute is not finalizable")]
    DisputeNotFinalizable,
    #[msg("Dispute not in valid court")]
    DisputeNotInValidCourt,
    #[msg("Dispute not claimable")]
    DisputeNotClaimable,
    #[msg("Cases already submitted")]
    CasesAlreadySubmitted,
    #[msg("Must include at least one user")]
    UsersEmpty,
    #[msg("User already voted in this dispute")]
    UserAlreadyVoted,
    #[msg("User does not have enough reputation to vote")]
    UserDoesNotHaveEnoughReputation,
    #[msg("User has unclaimed disputes")]
    UserHasUnclaimedDisputes,
    #[msg("User is participating in a max of " + USER_MAX_DISPUTES.to_string() + " disputes")]
    UserMaxDisputesReached,
    #[msg("User has no disputes to claim")]
    UserHasNoDisputesToClaim,
    #[msg("User cannot claim dispute")]
    UserCannotClaimDispute,
}
