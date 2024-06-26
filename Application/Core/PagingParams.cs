using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Application.Core
{
    public class PagingParams
    {
        private const int MAX_PAGE_SIZE = 50;

        public int PageNumber { get; set; } = 1;
        // TODO revert temp value to 10
        private int _pageSize = 2;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = (value > MAX_PAGE_SIZE) ? MAX_PAGE_SIZE : value;
        }
    }
}