import { observer } from "mobx-react-lite";
import { Grid } from "semantic-ui-react";
import ProfileHeader from "./ProfileHeader";
import ProfileContent from "./ProfileContent";
import { useParams } from "react-router-dom";
import { useStore } from "../../app/stores/store";
import { useEffect } from "react";
import LoadingComponent from "../../app/layout/LoadingComponent";

export default observer(function ProfilePage() {
    const {userName} = useParams<{userName: string}>();
    const {profileStore} = useStore();
    const {loadingProfile, loadProfile, profile, setActiveTab} = profileStore;

    useEffect(() => {
        if (userName) {
            loadProfile(userName);        
        }
        return () => setActiveTab(0);
    }, [loadProfile, userName, setActiveTab]);

    if (loadingProfile) return <LoadingComponent content="Loading profile..." />

    return (
      <Grid>
        <Grid.Column width={16}>
          {profile && (
            <>
              <ProfileHeader profile={profile} />
              <ProfileContent />
            </>
          )}
        </Grid.Column>
      </Grid>
    );
})