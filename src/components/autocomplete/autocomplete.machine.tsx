import { createMachine, assign } from "xstate";

async function getSearchResults(query: string) {
  return [{ id: '1', name: 'Hello'}, { id: '2', name: 'World'}]
}

const search = async (context: any, event: any) => {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(getSearchResults(context.query)
        ),
      500
    );
  });
}

const setQuery = assign((context: any, event: any) => ({ query: event?.payload?.query || '' }))
const setSearchResults = assign((context: any, event: any) => {
  return { results: event.data || [] }
})
const setErrorMessage = assign((context: any, event: any) => ({ errorMessage: event.data || [] }))
const setSelectedIndex = assign((context: any, event: any) => {
  if (event.payload.code === 'ArrowUp' && context.activeIndex > 0) {
    return { activeIndex: context.activeIndex - 1 }
  } else if (event.payload.code === 'ArrowDown' && context.activeIndex < context.results.length - 1) {
    return { activeIndex: context.activeIndex + 1 }
  }
})
const setActiveIndex = assign((context, event: any) => ({
    activeIndex: event.payload.index,
}))
const setDefaultIndex = assign((context: any, event: any) => {
  if (context.results?.length) {
    return { activeIndex: 0 }
  } else {
    return { activeIndex: -1 }
  }
})

export const autoCompleteMachine = createMachine(
  {
    id: "AutoComplete Machine",
    initial: "Idle",
    context: {
      query: '',
      results: [],
      errorMessage: null,
      activeIndex: -1,
    } as {
      query: string,
      results: { id: string, name: string }[],
      errorMessage: string | null,
      activeIndex: number
    },
    on: {
      INPUT: [{
        target: "Typing",
        cond: (context, event) => !!event.payload.query.length,
        actions: [setQuery],
      }, {
        target: 'Idle',
        actions: [setQuery],
      }],
    },
    states: {
      Idle: {},
      Typing: {
        after: {
          DEBOUNCE_INPUT_DELAY: "Searching"
        },
      },
      Searching: {
        invoke: {
          id: 'search',
          src: search,
          onError: {
            target: 'Error',
            actions: [setErrorMessage],
          },
          onDone: {
            target: 'Results',
            actions: [setSearchResults, setDefaultIndex],
          }
        },
        on: {
          SUCCESS: {
            target: "Results",
          },
          FAILURE: {
            target: "Error",
          },
        },
      },
      Results: {
        entry: {
          type: "DisplayResults",
          params: {},
        },
        on: {
          CHANGE_POSITION: {
            actions: [setSelectedIndex],
          },
          SET_ACTIVE_INDEX: {
            actions: [setActiveIndex]
          },
          CLEAR_RESULTS: {
            target: "Idle",
          },
          LOAD_MORE: {
            target: "Searching",
          },
          SELECT_CURRENT: {
            target: "Done",
          },
          SELECT_BY_ID: {
            target: "Done"
          }
        },
      },
      Error: {
        entry: {
          type: "DisplayError",
          params: {},
        },
        on: {
          CLEAR_RESULTS: {
            target: "Idle",
          },
        },
      },
      Done: {},
    },
    schema: {
      events: {} as
        | { type: "SUCCESS" }
        | { type: "FAILURE" }
        | { type: "INPUT", payload: { query: string } }
        | { type: "CHANGE_POSITION", payload: { code: 'ArrowDown' | 'ArrowUp' } }
        | { type: "SELECT_CURRENT" }
        | { type: "CLEAR_RESULTS" }
        | { type: "LOAD_MORE" }
        | { type: "SELECT_RESULT" }
        | { type: 'SET_ACTIVE_INDEX', payload: { index: number } }
        | { type: "SELECT_BY_ID", payload: { id: string } }
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {},
    services: {},
    guards: {},
    delays: {
      DEBOUNCE_INPUT_DELAY: (context, event) => context.query?.length ? 300 : 0
    },
  },
);
