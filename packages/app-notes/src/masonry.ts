/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-plus-operands, radix */

// https://github.com/GoogleChromeLabs/houdini-samples/blob/master/layout-worklet/masonry/masonry.js
// https://github.com/GoogleChromeLabs/houdini-samples/blob/master/layout-worklet/masonry/index.html
// https://github.com/w3c/css-houdini-drafts/blob/main/css-layout-api/EXPLAINER.md

export {};

// @ts-expect-error - experimental API
registerLayout(
  'masonry',
  class {
    static get inputProperties() {
      return ['--padding', '--columns'];
    }

    // eslint-disable-next-line class-methods-use-this
    async intrinsicSizes() {
      /* TODO implement :) */
    }

    // eslint-disable-next-line class-methods-use-this
    async layout(
      children: any[],
      _edges: any,
      constraints: { fixedInlineSize: number; fixedBlockSize: number },
      styleMap: { get: (key: string) => number },
    ) {
      const inlineSize = constraints.fixedInlineSize;

      const padding = Number.parseInt(styleMap.get('--padding').toString(), 10);
      const columnValue = styleMap.get('--columns').toString();

      // We also accept 'auto', which will select the BEST number of columns.
      let columns = Number.parseInt(columnValue);
      if (columnValue === 'auto' || !columns) {
        columns = Math.ceil(inlineSize / 350); // MAGIC NUMBER \o/.
      }

      // Layout all children with simply their column size.
      const childInlineSize = (inlineSize - (columns + 1) * padding) / columns;
      const childFragments = await Promise.all(
        children.map((child) =>
          child.layoutNextFragment({ fixedInlineSize: childInlineSize }),
        ),
      );

      let autoBlockSize = 0;
      // eslint-disable-next-line unicorn/no-new-array
      const columnOffsets = new Array<number>(columns).fill(0);
      for (const childFragment of childFragments) {
        // Select the column with the least amount of stuff in it.
        // eslint-disable-next-line unicorn/no-array-reduce
        const min = columnOffsets.reduce(
          (acc, val, idx) => {
            if (!acc || val < acc.val) {
              return { idx, val };
            }
            return acc;
          },
          { val: +Number.POSITIVE_INFINITY, idx: -1 },
        );

        childFragment.inlineOffset =
          padding + (childInlineSize + padding) * min.idx;
        childFragment.blockOffset = padding + min.val;

        columnOffsets[min.idx] =
          childFragment.blockOffset + childFragment.blockSize;
        autoBlockSize = Math.max(
          autoBlockSize,
          columnOffsets[min.idx] + padding,
        );
      }

      return { autoBlockSize, childFragments };
    }
  },
);
