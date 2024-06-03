import { observer } from 'mobx-react-lite'
import Calendar from 'react-calendar'
import { Header, Menu } from 'semantic-ui-react'

interface Props {}

export default observer(function ActivityFilters(props: Props) {
    const {} = props

    return (
      <>
        <Menu vertical size="large" style={{ width: "100%", marginTop: 28 }}>
          <Header icon="filter" attached color="teal" content="Filters" />
          <Menu.Item content="All Activities" />
          <Menu.Item content="I'm going" />
          <Menu.Item content="I'm hosting" />
        </Menu>
        <Header />
        <Calendar />
      </>
    );
})