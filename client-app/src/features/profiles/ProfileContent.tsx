import { observer } from "mobx-react-lite";
import { Tab, TabProps } from "semantic-ui-react";
import ProfilePhotos from "./ProfilePhotos";
import ProfileAbout from "./ProfileAbout";
import ProfileFollowings from "./ProfileFollowings";
import { useStore } from "../../app/stores/store";
import ProfileActivities from "./ProfileActivities";
import { NavLink, useParams } from "react-router-dom";
import { SyntheticEvent, useEffect } from "react";

interface Props {

}

export default observer(function ProfileContent({}: Props) {
	const { profileStore: { activeSection, setActiveSection } } = useStore();
    const { userName, section } = useParams();

	useEffect(() => {
		setActiveSection(section || "about");
		return () => setActiveSection(undefined);
	}, [section, setActiveSection]);

	const handleTabChange = (_e: SyntheticEvent, data: TabProps) => {
		if (!data || !data.panes) return;
		const selectedTabId = data.panes[data.activeIndex as number]?.menuItem?.id as string;
		setActiveSection(selectedTabId);
	}

    const panes = [
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/about`, id: "about", content: "About", key: "about" }, render: () => <ProfileAbout /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/photos`, id: "photos", content: "Photos", key: "photos" }, render: () => <ProfilePhotos /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/events`, id: "events", content: "Events", key: "events" }, render: () => <ProfileActivities /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/followers`, id: "followers", content: "Followers", key: "followers" }, render: () => <ProfileFollowings /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/following`, id: "following", content: "Followings", key: "following" }, render: () => <ProfileFollowings /> },
	];

    return (
        <Tab 
			menuPosition="right" 
			panes={panes}
			menu={{fluid: true, vertical: true}} 
			onTabChange={handleTabChange}
			activeIndex={panes.findIndex(p => p.menuItem.id === activeSection)}
		/>
    )
})