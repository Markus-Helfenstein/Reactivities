import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useStore } from "../../app/stores/store";
import { Profile } from "../../app/models/profile";
import { Button, Grid, Header, TabPane } from "semantic-ui-react";
import ProfileEdit from "./ProfileEdit";

export default observer(function ProfileAbout() {
    const { profileStore: { profile, isCurrentUser, isLoading, updateProfile } } = useStore();
    const [isFormMode, setIsFormMode] = useState(false);

    async function handleEditProfile(updatedProfile: Partial<Profile>) {
      await updateProfile(updatedProfile);
      setIsFormMode(false);
    }

    return (
      <TabPane>
        <Grid>
          <Grid.Column width={16}>
            <Header floated="left" icon="image" content="About" />
            {isCurrentUser && (
                <Button floated="right" basic 
                    content={isFormMode ? 'Cancel' : 'Edit Profile'} 
                    onClick={() => setIsFormMode(!isFormMode)}
                    disabled={isLoading}
                />
            )}
          </Grid.Column>
          <Grid.Column width={16}>
            {isCurrentUser && isFormMode ? (
                <ProfileEdit editProfile={handleEditProfile} currentProfile={profile!} />
            ) : (
                <>
                    <h1>{profile?.displayName}</h1>
                    <span style={{whiteSpace: "pre-wrap"}}>{profile?.bio}</span>
                </>
            )}
          </Grid.Column>
        </Grid>
      </TabPane>
    )
});