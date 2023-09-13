import { createMachine, assign } from "xstate";

async function getSearchResults(query: string) {
	return [
		{ id: "1", name: "Hello" },
		{ id: "2", name: "World" },
	];
}

function search(context: any, event: any) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(getSearchResults(context.query)), 500);
	});
}

function loadMore(context: any, event: any) {
	return new Promise((resolve) => {
		setTimeout(
			() =>
				resolve([
					{ id: "3", name: "More" },
					{ id: "4", name: "Data" },
				]),
			500
		);
	});
}

export const autoCompleteMachine = createMachine(
	{
		id: "AutoComplete",
		initial: "Idle",
		context: {
			query: "",
			results: [],
			errorMessage: null,
			activeIndex: -1,
		} as {
			query: string;
			results: { id: string; name: string }[];
			errorMessage: string | null;
			activeIndex: number;
		},
		on: {
			INPUT: {
				target: "Typing",
				cond: (context, event) => !!event.payload.query.length,
				actions: ["setQuery"],
			},
			CLEAR_INPUT: {
				target: "Idle",
				actions: ["clearQuery"],
			},
		},
		states: {
			Idle: {},
			Typing: {
				after: {
					DEBOUNCE_INPUT_DELAY: "Searching",
				},
			},
			Searching: {
				invoke: {
					id: "search",
					src: search,
					onError: {
						target: "Error",
						actions: ["setErrorMessage"],
					},
					onDone: {
						target: "Results",
						actions: ["setSearchResults", "setDefaultIndex"],
					},
				},
			},
			Results: {
				on: {
					KEY_TOGGLE_ACTIVE_INDEX: {
						actions: ["setSelectedIndex"],
					},
					SET_ACTIVE_INDEX: {
						actions: ["setActiveIndex"],
					},
					LOAD_MORE: {
						target: "#AutoComplete.Results.LoadMore",
						// add condition if more exists
					},
					SELECT_CURRENT: {
						target: "Done",
					},
					SELECT_BY_ID: {
						target: "Done",
					},
				},
				initial: "Loaded",
				states: {
					Loaded: {},
					LoadMore: {
						invoke: {
							id: "loadMore",
							src: loadMore,
							onError: {
								target: "#AutoComplete.Error",
								actions: ["setErrorMessage"],
							},
							onDone: {
								target: "#AutoComplete.Results.Loaded",
								actions: ["appendSearchResults"],
							},
						},
					},
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
				| { type: "INPUT"; payload: { query: string } }
				| { type: "CLEAR_INPUT" }
				| {
						type: "KEY_TOGGLE_ACTIVE_INDEX";
						payload: { code: "ArrowDown" | "ArrowUp" };
				  }
				| { type: "SELECT_CURRENT" }
				| { type: "CLEAR_RESULTS" }
				| { type: "LOAD_MORE" }
				| { type: "SELECT_RESULT" }
				| { type: "SET_ACTIVE_INDEX"; payload: { index: number } }
				| { type: "SELECT_BY_ID"; payload: { id: string } },
		},
		predictableActionArguments: true,
		preserveActionOrder: true,
	},
	{
		actions: {
			setQuery: assign((context: any, event: any) => {
				return { query: event?.payload?.query || "" };
			}),
			clearQuery: assign((context: any, event: any) => {
				return { query: "" };
			}),
			setSearchResults: assign(function setSearchResults(
				context: any,
				event: any
			) {
				return { results: event.data || [] };
			}),
			appendSearchResults: assign(function setSearchResults(
				context: any,
				event: any
			) {
				return { results: [...context.results, ...event.data] };
			}),
			setErrorMessage: assign(function setErrorMessage(
				context: any,
				event: any
			) {
				return { errorMessage: event.data || [] };
			}),
			setSelectedIndex: assign(function setSelectedIndex(
				context: any,
				event: any
			) {
				if (
					event.payload.code === "ArrowUp" &&
					context.activeIndex > 0
				) {
					return { activeIndex: context.activeIndex - 1 };
				} else if (
					event.payload.code === "ArrowDown" &&
					context.activeIndex < context.results.length - 1
				) {
					return { activeIndex: context.activeIndex + 1 };
				}
			}),
			setActiveIndex: assign(function setActiveIndex(
				context,
				event: any
			) {
				return {
					activeIndex: event.payload.index,
				};
			}),
			setDefaultIndex: assign(function setDefaultIndex(
				context: any,
				event: any
			) {
				if (context.results?.length) {
					return { activeIndex: 0 };
				} else {
					return { activeIndex: -1 };
				}
			}),
		},
		services: {},
		guards: {},
		delays: {
			DEBOUNCE_INPUT_DELAY: (context, event) =>
				context.query?.length ? 300 : 0,
		},
	}
);
