import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { Card, Grid, Header, TabPane } from "semantic-ui-react";
import ProfileCard from "./ProfileCard";

interface Props {

}

export default observer(function ProfileFollowings({}: Props) {
    const {profileStore} = useStore();
    const { profile, followings, loadingFollowings, activeSection } = profileStore;

    return (
		<TabPane loading={loadingFollowings}>
			<Grid>
				<Grid.Column width={16}>
					<Header floated="left" icon="user" 
                        content={activeSection === "followers" ? `People following ${profile?.displayName}` : `People ${profile?.displayName} is following`} />
				</Grid.Column>
				<Grid.Column width={16}>
                    <Card.Group itemsPerRow={4}>
                        {followings.map(p => 
                            <ProfileCard key={profile?.userName} profile={p} />
                        )}
                    </Card.Group>
                </Grid.Column>
			</Grid>
		</TabPane>
	);
});