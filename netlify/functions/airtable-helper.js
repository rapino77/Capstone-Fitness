/**
 * Helper function to properly handle Airtable's eachPage method
 * Wraps it in a Promise to avoid Lambda exit issues
 */
async function fetchRecords(table, options = {}) {
  return new Promise((resolve, reject) => {
    const records = [];
    
    table
      .select(options)
      .eachPage(
        (pageRecords, fetchNextPage) => {
          records.push(...pageRecords);
          fetchNextPage();
        },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(records);
          }
        }
      );
  });
}

module.exports = { fetchRecords };