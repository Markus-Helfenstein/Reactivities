import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { Grid, Header, Tab, TabPane, TabProps } from "semantic-ui-react";
import { NavLink, useParams } from "react-router-dom";
import { SyntheticEvent, useEffect } from "react";
import ProfileActivitiesTabPane from "./ProfileActivitiesTabPane";

interface Props {}

export default observer(function ProfileActivities({}: Props) {
	const { profileStore: { activeSubSection, setActiveSubSection } } = useStore();
    const { userName, subSection } = useParams();

	useEffect(() => {
		// activates tab depending on subSection from route
		setActiveSubSection(subSection || "future");
		return () => setActiveSubSection(undefined);
	}, [subSection, setActiveSubSection]);

	const handleTabChange = (_e: SyntheticEvent, data: TabProps) => {
		if (!data || !data.panes) return;
		const selectedTabKey = data.panes[data.activeIndex as number]?.menuItem?.key as string;
		setActiveSubSection(selectedTabKey);
	}

    const panes = [
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/events/future`, id: "future", content: "Future Events", key: "future" }, render: () => <ProfileActivitiesTabPane /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/events/past`, id: "past", content: "Past Events", key: "past" }, render: () => <ProfileActivitiesTabPane /> },
		{ menuItem: { as: NavLink, to: `/profiles/${userName}/events/hosting`, id: "hosting", content: "Hosting", key: "hosting" }, render: () => <ProfileActivitiesTabPane /> },
	];

    return (
		<TabPane>
			<Grid>
				<Grid.Column width={16}>
					<Header floated="left" icon="calendar" content="Activities" />
				</Grid.Column>
				<Grid.Column width={16}>
					<Tab 
						menu={{ secondary: true, pointing: true }}
						panes={panes}
						onTabChange={handleTabChange}
						activeIndex={panes.findIndex(p => p.menuItem.key === activeSubSection)}
					/>
				</Grid.Column>
			</Grid>
		</TabPane>
    );
})