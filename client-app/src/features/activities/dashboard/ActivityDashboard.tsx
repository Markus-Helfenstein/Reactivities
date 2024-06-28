import { Grid, Loader } from 'semantic-ui-react'
import ActivityList from './ActivityList';
import { useStore } from '../../../app/stores/store';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ActivityFilters from './ActivityFilters';
import { PagingParams } from '../../../app/models/pagination';
import InfiniteScroll from 'react-infinite-scroller';
import ActivityListItemPlaceholder from './ActivityListItemPlaceholder';

export default observer(function ActivityDashboard() {
  const { activityStore } = useStore();
  const { loadActivities, activityRegistry, setPagingParams, pagination } = activityStore;
  const [loadingNext, setLoadingNext] = useState(false);

  const handleGetNext = async () => {
    setLoadingNext(true);
    try {
      setPagingParams(new PagingParams(pagination!.currentPage + 1));
      // pass 'false' as isInitialization parameter to signal that collection mustn't be cleared
      await loadActivities(false);
    } finally {
      setLoadingNext(false);
    }
  }

  useEffect(() => {
    // TODO course uses workaround that I don't like
    if (activityRegistry.size <= 1) loadActivities();
  }, [activityRegistry.size, loadActivities]); // activityRegistry.size

  return (
    <Grid>
      <Grid.Column width="10">
        {activityStore.loadingInitial && activityRegistry.size === 0 && !loadingNext ? (
          <>
            <ActivityListItemPlaceholder />
            <ActivityListItemPlaceholder />
            <ActivityListItemPlaceholder />
          </>
        ) : (
          <InfiniteScroll
            pageStart={0}
            loadMore={handleGetNext}
            // without !loadingNext, this might go into an infinite loop
            hasMore={!loadingNext && !!pagination && pagination.currentPage < pagination.totalPages}
            initialLoad={false}
          >
            <ActivityList />
          </InfiniteScroll>          
        )}
      </Grid.Column>
      <Grid.Column width="6">
        <ActivityFilters />
      </Grid.Column>
      <Grid.Column width={10}>
        <Loader active={loadingNext} />
      </Grid.Column>
    </Grid>
  );
});
