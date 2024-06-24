import { observer } from "mobx-react-lite";
import { Tab, TabPane } from "semantic-ui-react";
import ProfilePhotos from "./ProfilePhotos";
import ProfileAbout from "./ProfileAbout";
import ProfileFollowings from "./ProfileFollowings";
import { useStore } from "../../app/stores/store";

interface Props {

}

export default observer(function ProfileContent({}: Props) {
	const {profileStore} = useStore();

    const panes = [
		{ menuItem: "About", render: () => <ProfileAbout /> },
		{ menuItem: "Photos", render: () => <ProfilePhotos /> },
		{ menuItem: "Events", render: () => <TabPane>Events Content</TabPane> },
		{ menuItem: "Followers", render: () => <ProfileFollowings /> },
		{ menuItem: "Following", render: () => <ProfileFollowings /> },
	];

    return (
        <Tab 
			menuPosition="right" 
			panes={panes}
			menu={{fluid: true, vertical: true}} 
			onTabChange={(_e, data) => profileStore.setActiveTab(data.activeIndex as number)}
		/>
    )
})