import { parseAtoms, assign, LinkedListAtom, reatomString, Action, atom, reatomBoolean } from '@reatom/framework'
import { h, hf, JSX } from '@reatom/jsx'
import { reatomZod } from '@reatom/npm-zod'
import { z } from 'zod'

const Filters = z.object({
  hoverPreview: z.boolean(),
  inlinePreview: z.boolean(),
  timestamps: z.boolean(),
  filtersFolded: z.boolean(),
  actionsFolded: z.boolean(),
  valuesSearch: z.string(),
  list: z.array(
    z.object({
      name: z.string().readonly(),
      search: z.string(),
      type: z.enum(['match', 'mismatch', 'exclude', 'highlight', 'off']),
      color: z.string(),
      readonly: z.boolean().readonly(),
    }),
  ),
})
type Filters = z.infer<typeof Filters>

const DEFAULT_COLOR = '#BABACF'

const initState: Filters = {
  hoverPreview: true,
  inlinePreview: false,
  timestamps: true,
  filtersFolded: false,
  actionsFolded: false,
  valuesSearch: '',
  list: [{ name: 'private', search: `(^_)|(\._)`, type: 'mismatch', color: DEFAULT_COLOR, readonly: true }],
}
const initSnapshot = JSON.stringify(initState)
const version = 'v20'

const FilterButton = ({
  isInput,
  ...props
}: (JSX.IntrinsicElements['button'] & { isInput?: false }) | (JSX.IntrinsicElements['input'] & { isInput: true })) => {
  const Component = isInput ? 'input' : 'button'
  return (
    // @ts-expect-error
    <Component
      {...props}
      css={`
        width: 25px;
        height: 20px;
        padding: 0;
        margin-right: 5px;
        border: 2px solid transparent;
        border-radius: 2px;
        font-size: 14px;
        filter: grayscale(1);
        &[disabled] {
          border: 2px solid rgb(21 19 50 / 20%);
        }
        ${props.css || ''}
      `}
    />
  )
}

export const reatomFilters = (
  {
    list,
    clearLines,
    redrawLines,
  }: { list: LinkedListAtom; clearLines: Action<[], void>; redrawLines: Action<[], void> },
  name: string,
) => {
  const KEY = name + version

  try {
    var snapshot: undefined | Filters = Filters.parse(JSON.parse(localStorage.getItem(KEY) || initSnapshot))
  } catch {}

  const filters = reatomZod(Filters, {
    initState: snapshot || initState,
    sync: (ctx) => {
      redrawLines(ctx)
      ctx.schedule(() => {
        localStorage.setItem(KEY, JSON.stringify(parseAtoms(ctx, filters)))
      })
    },
    name: `${name}.filters`,
  })

  const newFilter = reatomString('', `${name}.include`)

  return assign(filters, {
    element: (
      <div>
        <fieldset
          data-folded={filters.filtersFolded}
          css={`
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin: 0 20px;

            &[data-folded] {
              max-height: 0px;
              overflow: hidden;
              padding-bottom: 0;
            }
          `}
        >
          <legend
            css={`
              cursor: pointer;
            `}
            aria-label="Show/hide filters"
            title="Show/hide filters"
            tabindex={0}
            role="button"
            aria-expanded={filters.filtersFolded}
            on:click={filters.filtersFolded.toggle}
          >
            filters
          </legend>
          <form
            on:submit={(ctx, e) => {
              e.preventDefault()
              const name = ctx.get(newFilter)
              filters.list.create(ctx, {
                name,
                search: name.toLocaleLowerCase(),
                type: 'off',
                readonly: false,
              })
              newFilter.reset(ctx)
            }}
            css={`
              display: inline-flex;
              align-items: center;
            `}
          >
            <input
              model:value={newFilter}
              placeholder="New filter"
              css={`
                width: 142px;
              `}
            />
            <button
              css={`
                width: 70px;
              `}
            >
              create
            </button>
          </form>
          <table
            css={`
              width: fit-content;
            `}
          >
            {filters.list.reatomMap((ctx, filter) => {
              const id = `${filters.list.__reatom.name}-${filter.name}`
              return (
                <tr>
                  <th
                    scope="row"
                    css={`
                      font-weight: normal;
                      text-align: start;
                      padding-right: 10px;
                    `}
                  >
                    {filter.name}
                  </th>
                  <td
                    css={`
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    `}
                  >
                    <FilterButton
                      title="match"
                      aria-label="match"
                      disabled={atom((ctx) => ctx.spy(filter.type) === 'match')}
                      on:click={filter.type.setMatch}
                    >
                      =
                    </FilterButton>
                    <FilterButton
                      title="not match"
                      aria-label="not match"
                      disabled={atom((ctx) => ctx.spy(filter.type) === 'mismatch')}
                      on:click={filter.type.setMismatch}
                    >
                      ≠
                    </FilterButton>
                    <FilterButton
                      isInput
                      title="highlight"
                      aria-label="highlight"
                      type="color"
                      on:click={(ctx, e) => {
                        if (ctx.get(filter.type) !== 'highlight') {
                          filter.type.setHighlight(ctx)
                          e.preventDefault()
                        }
                      }}
                      model:value={filter.color}
                      css:border={atom((ctx) =>
                        ctx.spy(filter.type) === 'highlight'
                          ? '2px solid rgb(21 19 50 / 20%)'
                          : '2px solid transparent',
                      )}
                      css={`
                        font-size: 10px;
                        filter: unset;
                        border: var(--border);
                      `}
                    />
                    <FilterButton
                      title="exclude"
                      aria-label="exclude"
                      disabled={atom((ctx) => ctx.spy(filter.type) === 'exclude')}
                      on:click={filter.type.setExclude}
                    >
                      ⊘
                    </FilterButton>
                    <FilterButton
                      title={atom((ctx) => (ctx.spy(filter.type) === 'off' ? 'enable' : 'disable'))}
                      aria-label={atom((ctx) => (ctx.spy(filter.type) === 'off' ? 'enable' : 'disable'))}
                      disabled={atom((ctx) => ctx.spy(filter.type) === 'off')}
                      on:click={filter.type.setOff}
                    >
                      {atom((ctx) => (ctx.spy(filter.type) === 'off' ? '▶' : '◼'))}
                    </FilterButton>
                  </td>
                  <td>
                    <input id={id} placeholder="RegExp" model:value={filter.search} readonly={filter.readonly} />
                    <button
                      title="Remove"
                      aria-label="Remove filter"
                      disabled={filter.readonly}
                      on:click={(ctx) => filters.list.remove(ctx, filter)}
                    >
                      x
                    </button>
                  </td>
                </tr>
              )
            })}
          </table>
          <input
            title="Search in states"
            aria-label="Search in states"
            model:value={filters.valuesSearch}
            placeholder="Search in states"
            type="search"
            css={`
              width: 200px;
            `}
          />
        </fieldset>
        <fieldset
          data-folded={filters.actionsFolded}
          css={`
            display: flex;
            gap: 10px;
            margin: 0 20px;
            top: 0;
            overflow: auto;

            &[data-folded] {
              max-height: 0px;
              overflow: hidden;
              padding-bottom: 0;
            }
          `}
        >
          <legend
            css={`
              cursor: pointer;
            `}
            aria-label="Show/hide actions"
            title="Show/hide actions"
            tabindex={0}
            role="button"
            aria-expanded={filters.filtersFolded}
            on:click={filters.actionsFolded.toggle}
          >
            actions
          </legend>
          <div
            css={`
              width: 150px;
              display: flex;
              align-items: flex-start;
              gap: 14px;
            `}
          >
            <button
              on:click={clearLines}
              css={`
                background: none;
                border: none;
                cursor: pointer;
                flex-shrink: 0;
              `}
            >
              clear lines
            </button>
            <button
              on:click={list.clear}
              css={`
                background: none;
                border: none;
                cursor: pointer;
                flex-shrink: 0;
              `}
            >
              clear logs
            </button>
            <label
              css={`
                flex-shrink: 0;
                display: flex;
                align-items: center;
              `}
            >
              <input model:checked={filters.inlinePreview} />
              inline preview
            </label>
            <label
              css={`
                flex-shrink: 0;
                display: flex;
                align-items: center;
              `}
            >
              <input model:checked={filters.hoverPreview} />
              hover preview
            </label>
            <label
              css={`
                flex-shrink: 0;
                display: flex;
                align-items: center;
              `}
            >
              <input model:checked={filters.timestamps} />
              timestamps
            </label>
          </div>
        </fieldset>
      </div>
    ),
  })
}
