import { observer } from "mobx-react-lite";
import { Profile } from "../../app/models/profile";
import { Reveal, Button } from "semantic-ui-react";
import { useStore } from "../../app/stores/store";
import { SyntheticEvent } from "react";

interface Props {
    profile: Profile;
}

export default observer(function FollowButton({profile}: Props) {
    const {profileStore, userStore} = useStore();
    const {toggleFollowing, isLoading} = profileStore;

    // don't show follow button on user's own profile card
    if (userStore.user?.userName === profile.userName) return null;

    const handleFollow = async (e: SyntheticEvent, userName: string) => {
        // In profile card, button is put inside a link. This makes sure link isn't activated on button click
        e.preventDefault();
        return toggleFollowing(userName, !profile.isCurrentUserFollowing);
    }

    return (
        <Reveal animated="move">
            <Reveal.Content visible style={{ width: "100%" }}>
                <Button fluid color="teal" 
                    content={profile.isCurrentUserFollowing ? "Following" : "Not following"} 
                />
            </Reveal.Content>
            <Reveal.Content hidden style={{ width: "100%" }}>
                <Button fluid basic 
                    color={profile.isCurrentUserFollowing ? "red" : "green"} 
                    content={profile.isCurrentUserFollowing ? "Unfollow" : "Follow"} 
                    loading={isLoading}
                    onClick={(e) => handleFollow(e, profile.userName)}
                />
            </Reveal.Content>
        </Reveal>
    )
})