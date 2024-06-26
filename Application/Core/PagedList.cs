using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Application.Core
{
    public class PagedList<T>(IEnumerable<T> items, int count, int pageNumber, int pageSize) : List<T>(items)
    {
        public int CurrentPage { get; set; } = pageNumber;
        public int TotalPages { get => (int)Math.Ceiling(TotalCount / (double)PageSize); }
        public int PageSize { get; set; } = pageSize;
        public int TotalCount { get; set; } = count;
    }

    public static class PagedList
    {
        /// <summary>
        /// Custom extension method in LINQ style that determines the total count and delivers the paged results 
        /// </summary>
        /// <typeparam name="T">The list item's type</typeparam>
        /// <param name="source">WHERE and ORDER BY may be added beforehand</param>
        /// <param name="pageNumber">based on 1!!!</param>
        /// <param name="pageSize"></param>
        /// <returns>an extended List<typeparamref name="T"/> class usable for paging</returns>
        public static async Task<PagedList<T>> ToPagedListAsync<T>(this IQueryable<T> source, int pageNumber, int pageSize)
        {
            // Next two lines execute an individual database query each
            // TODO wouldn't it be faster to get the total count in an extra column and avoid the extra roundtrip?
            var count = await source.CountAsync();
            var items = await source.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
            return new PagedList<T>(items, count, pageNumber, pageSize);
        }
    }
}