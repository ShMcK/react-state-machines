import React from "react";
import { useMachine } from "@xstate/react";
import { autoCompleteMachine } from "./autocomplete.machine";

export function AutoComplete() {
  const [current, send] = useMachine(autoCompleteMachine);
  
  // debugger
  // console.log('xstate', current.value.toString(), current.context)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value.length) {
      send({ type: "CLEAR_INPUT" })  
    } else {
    send({ type: "INPUT", payload: { query: e.target.value } })
  }
  }

  function onSelect(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    // @ts-ignore
    const itemId = event.target.getAttribute('data-id')
    send({ type: 'SELECT_BY_ID', payload: { id: itemId }})
  }

  function onHover(event: React.MouseEvent) {
    event?.preventDefault();
    // @ts-ignore
    const dataIndex = event.target.getAttribute('data-index')
    const itemIndex = dataIndex ? parseInt(dataIndex) : null
    if (typeof itemIndex === 'number' && itemIndex !== current.context.activeIndex) {
      send({ type: 'SET_ACTIVE_INDEX', payload: { index: itemIndex }})
    }
  }

  function onLoadMore() {
    send({ type: 'LOAD_MORE'})
  }

  function handleKeyPress(e: React.KeyboardEvent): void {
    switch(e.code) {
      case 'ArrowDown':
      case 'ArrowUp':
        send({ type: 'KEY_TOGGLE_ACTIVE_INDEX', payload: { code: e.code }})
        return
      case 'Enter':
        send({ type: 'SELECT_CURRENT' })
        return
      default:
        return
    }
  }
  
  return <div>
    <input type="text" onChange={handleChange} value={current.context.query} onKeyDown={handleKeyPress}/>
    {current.matches('Searching') && <div>Searching</div>}
    {current.matches('Error') && <div>{current.context.errorMessage}</div>}
    {current.matches('Results') && (
      <>
      <div onClick={onSelect} onMouseOver={onHover}>{current.context.results.map((item: any, index: number) => (
        <div key={item.id} data-id={item.id} data-index={index}>{index === current.context.activeIndex ? '*' : ' '} {item.name}</div>)
      )}</div>
      <button onClick={onLoadMore}>Load More</button>
      </>
    )}
    {current.matches('Done') && <div>! {current.context.results[current.context.activeIndex]?.name}</div>}
    </div>;
}
